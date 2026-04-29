import json
from fastapi import WebSocket, WebSocketDisconnect
from sqlalchemy.ext.asyncio import AsyncSession
from app.api.websocket.manager import manager
from app.db import crud
from app.ai.judge import evaluate_arguments


async def game_websocket_handler(
    websocket: WebSocket,
    match_id: str,
    user_id: str,
    db: AsyncSession,
):
    """
    Ana WebSocket oyun döngüsü.
    Mesaj tipleri:
      - argument   : Savcı/Avukat argüman gönderir
      - objection  : Anlık itiraz (sırayı keser)
      - evidence   : Delil sunumu
      - chat       : Serbest sohbet (OOC)
    """
    await manager.connect(websocket, match_id, user_id)

    # Bağlanan oyuncuya mevcut durum gönder
    match = await crud.matches.get_match_by_id(db, match_id)
    if not match:
        await websocket.close(code=4004)
        return

    await manager.send_personal(match_id, user_id, {
        "type": "state_sync",
        "match_id": match_id,
        "judge_hp": match.judge_hp,
        "current_turn": match.current_turn,
        "status": match.status,
        "case": {
            "title": match.case.title if match.case else "Bilinmeyen Dava",
            "description": match.case.description if match.case else "",
        } if match.case else None,
    })

    # Herkese bağlantı bildirimi
    await manager.broadcast(match_id, {
        "type": "player_joined",
        "user_id": user_id,
        "connected_users": manager.get_connected_users(match_id),
    })

    try:
        while True:
            raw = await websocket.receive_text()
            try:
                data = json.loads(raw)
            except json.JSONDecodeError:
                await manager.send_personal(match_id, user_id, {
                    "type": "error",
                    "message": "Geçersiz mesaj formatı."
                })
                continue

            msg_type = data.get("type")

            # ── ARGÜMAN ──────────────────────────────────────
            if msg_type == "argument":
                content = data.get("content", "").strip()
                if not content:
                    continue

                # Güncel match durumunu çek
                match = await crud.matches.get_match_by_id(db, match_id)
                if not match or match.status != "active":
                    await manager.send_personal(match_id, user_id, {
                        "type": "error", "message": "Maç aktif değil."
                    })
                    continue

                # Argümanı logla
                await crud.matches.add_log(
                    db, match_id=match_id, action_type="argument",
                    content=content, user_id=user_id
                )

                # Tüm oyunculara argümanı yayınla
                await manager.broadcast(match_id, {
                    "type": "argument",
                    "user_id": user_id,
                    "content": content,
                    "turn": match.current_turn,
                })

            # ── SIRAYI BİTİR (END TURN) ───────────────────────
            elif msg_type == "end_turn":
                match = await crud.matches.get_match_by_id(db, match_id)
                if not match or match.status != "active":
                    continue

                user_role = _get_role(match, user_id)
                if user_role != match.current_turn:
                    continue  # Kendi sırası değilse bitiremez

                logs = match.logs
                prosecution_args = [l.content for l in logs if l.action_type == "argument" and _get_role(match, l.user_id) == "prosecutor"]
                defense_args = [l.content for l in logs if l.action_type == "argument" and _get_role(match, l.user_id) == "defense"]

                # Eğer savcı sırasını bitirdiyse ve bot moduysa, bota otomatik cevap verdir ve hemen değerlendir
                if match.mode == "bot" and match.current_turn == "prosecutor":
                    bot_id = _get_player_by_role(match, "defense")
                    bot_arg = "Müvekkilim masumdur. Savcılığın sunduğu deliller yetersiz ve yoruma açıktır."
                    
                    # Basit bir bot argümanı oluştur
                    await crud.matches.add_log(
                        db, match_id=match_id, action_type="argument",
                        content=bot_arg, user_id=bot_id
                    )
                    await manager.broadcast(match_id, {
                        "type": "argument",
                        "user_id": bot_id,
                        "content": bot_arg,
                        "turn": "defense",
                    })
                    defense_args.append(bot_arg)
                    
                    # Bot oynadıktan sonra sıra yapay zeka hakime geçer
                    trigger_ai_eval = True
                    new_turn = "prosecutor" # Değerlendirme sonrası sıra savcıya döner
                
                elif match.current_turn == "prosecutor":
                    # Bot modu değilse, savcı bitirince sıra avukata geçer (henüz AI değerlendirmez)
                    trigger_ai_eval = False
                    new_turn = "defense"

                elif match.current_turn == "defense":
                    # Avukat da bitirince AI değerlendirir
                    trigger_ai_eval = True
                    new_turn = "prosecutor"

                # AI Değerlendirmesi
                if trigger_ai_eval and prosecution_args and defense_args and match.ai_judge_active:
                    await manager.broadcast(match_id, {"type": "ai_evaluating"})
                    verdict = await evaluate_arguments(
                        case_description=match.case.description if match.case else "Bilinmeyen dava.",
                        prosecution_arg=prosecution_args[-1],
                        defense_arg=defense_args[-1],
                    )

                    # HP güncelle
                    updated_match = await crud.matches.update_match_hp(
                        db, match_id, verdict["judge_hp_delta"]
                    )

                    # Verdict logla
                    await crud.matches.add_log(
                        db, match_id=match_id, action_type="ai_verdict",
                        content=verdict["reasoning"],
                        ai_score=verdict["prosecutor_score"],
                        ai_reasoning=verdict["reasoning"],
                        judge_hp_delta=verdict["judge_hp_delta"],
                    )

                    await manager.broadcast(match_id, {
                        "type": "ai_verdict",
                        "prosecutor_score": verdict["prosecutor_score"],
                        "defense_score": verdict["defense_score"],
                        "reasoning": verdict["reasoning"],
                        "advantage": verdict["advantage"],
                        "judge_hp": updated_match.judge_hp,
                        "judge_hp_delta": verdict["judge_hp_delta"],
                        "match_finished": updated_match.status == "finished",
                    })

                    if updated_match.status == "finished":
                        winner_role = "defense" if verdict["advantage"] == "defense" else "prosecutor"
                        winner_id = _get_player_by_role(match, winner_role)
                        if winner_id:
                            await crud.matches.finish_match(db, match_id, winner_id)
                        await manager.broadcast(match_id, {
                            "type": "game_over",
                            "winner_role": winner_role,
                            "winner_id": winner_id,
                        })
                        return # Oyun bitti

                # Son olarak sırayı değiştir (eğer oyun bitmediyse)
                match_obj = await db.get(__import__('app.db.models', fromlist=['Match']).Match, match_id)
                if match_obj and match_obj.status != "finished":
                    match_obj.current_turn = new_turn
                    await db.flush()
                    await manager.broadcast(match_id, {
                        "type": "turn_change",
                        "current_turn": new_turn,
                    })

            # ── İTİRAZ ───────────────────────────────────────
            elif msg_type == "objection":
                await crud.matches.add_log(
                    db, match_id=match_id, action_type="objection",
                    content=data.get("reason", ""), user_id=user_id
                )
                await manager.broadcast(match_id, {
                    "type": "objection",
                    "user_id": user_id,
                    "reason": data.get("reason", ""),
                })

            # ── DELİL SUNUMU ─────────────────────────────────
            elif msg_type == "evidence":
                evidence_id = data.get("evidence_id")
                await crud.matches.add_log(
                    db, match_id=match_id, action_type="evidence_submit",
                    user_id=user_id, evidence_id=evidence_id,
                    content=data.get("description", ""),
                )
                await manager.broadcast(match_id, {
                    "type": "evidence_submitted",
                    "user_id": user_id,
                    "evidence_id": evidence_id,
                    "description": data.get("description", ""),
                })

            # ── SOHBET ───────────────────────────────────────
            elif msg_type == "chat":
                await manager.broadcast(match_id, {
                    "type": "chat",
                    "user_id": user_id,
                    "content": data.get("content", ""),
                })

    except WebSocketDisconnect:
        manager.disconnect(match_id, user_id)
        await manager.broadcast(match_id, {
            "type": "player_left",
            "user_id": user_id,
            "connected_users": manager.get_connected_users(match_id),
        })


def _get_role(match, user_id: str) -> str:
    for p in match.participants:
        if p.user_id == user_id:
            return p.role
    return "unknown"


def _get_player_by_role(match, role: str) -> str:
    for p in match.participants:
        if p.role == role:
            return p.user_id
    return None

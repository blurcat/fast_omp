"""通知服务 - 支持钉钉、Webhook、Email"""
import httpx
from loguru import logger
from typing import Any, Dict


async def send_dingtalk(webhook_url: str, title: str, content: str, token: str = None) -> bool:
    """发送钉钉机器人消息"""
    payload = {
        "msgtype": "markdown",
        "markdown": {
            "title": title,
            "text": f"## {title}\n\n{content}"
        }
    }
    headers = {}
    if token:
        import hmac, hashlib, base64, time, urllib.parse
        timestamp = str(round(time.time() * 1000))
        secret_enc = token.encode('utf-8')
        string_to_sign = f'{timestamp}\n{token}'
        hmac_code = hmac.new(secret_enc, string_to_sign.encode('utf-8'), digestmod=hashlib.sha256).digest()
        sign = urllib.parse.quote_plus(base64.b64encode(hmac_code))
        webhook_url = f"{webhook_url}&timestamp={timestamp}&sign={sign}"

    try:
        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.post(webhook_url, json=payload, headers=headers)
            data = resp.json()
            if data.get("errcode") == 0:
                return True
            logger.warning(f"DingTalk error: {data}")
            return False
    except Exception as e:
        logger.error(f"DingTalk send failed: {e}")
        return False


async def send_webhook(webhook_url: str, payload: Dict[str, Any]) -> bool:
    """发送通用 Webhook"""
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.post(webhook_url, json=payload)
            return resp.status_code < 300
    except Exception as e:
        logger.error(f"Webhook send failed: {e}")
        return False


async def send_email(emails: list, subject: str, body: str) -> bool:
    """发送邮件（需要配置SMTP，这里仅记录日志）"""
    logger.info(f"Email to {emails}: {subject}\n{body}")
    # TODO: integrate SMTP
    return True


async def notify_alert(channel_config: Dict[str, Any], channel_type: str,
                       event_title: str, event_body: str) -> bool:
    """根据渠道类型发送告警通知"""
    if channel_type == "dingtalk":
        webhook_url = channel_config.get("webhook_url", "")
        token = channel_config.get("token")
        return await send_dingtalk(webhook_url, event_title, event_body, token)
    elif channel_type == "webhook":
        webhook_url = channel_config.get("webhook_url", "")
        return await send_webhook(webhook_url, {
            "title": event_title,
            "body": event_body,
            "type": "alert"
        })
    elif channel_type == "email":
        emails = channel_config.get("emails", [])
        return await send_email(emails, event_title, event_body)
    return False

"""作业执行服务 - SSH 远程执行"""
import asyncio
from datetime import datetime, timezone
from typing import List, Optional, Callable
from loguru import logger

try:
    import asyncssh
    HAS_ASYNCSSH = True
except ImportError:
    HAS_ASYNCSSH = False
    logger.warning("asyncssh not installed, SSH execution disabled")


async def execute_ssh_command(
    host: str,
    port: int = 22,
    username: str = "root",
    password: Optional[str] = None,
    private_key: Optional[str] = None,
    command: str = "echo hello",
    timeout: int = 300,
    on_output: Optional[Callable] = None,
) -> dict:
    """
    SSH 执行命令，返回 {stdout, stderr, exit_code, success}
    on_output: 回调函数，实时接收输出行
    """
    if not HAS_ASYNCSSH:
        return {
            "stdout": "",
            "stderr": "asyncssh not installed",
            "exit_code": -1,
            "success": False
        }

    connect_kwargs = {
        "host": host,
        "port": port,
        "username": username,
        "known_hosts": None,
        "connect_timeout": 30,
    }
    if password:
        connect_kwargs["password"] = password
    if private_key:
        connect_kwargs["client_keys"] = [asyncssh.import_private_key(private_key)]

    try:
        async with asyncssh.connect(**connect_kwargs) as conn:
            result = await asyncio.wait_for(
                conn.run(command, check=False),
                timeout=timeout
            )
            stdout = result.stdout or ""
            stderr = result.stderr or ""
            exit_code = result.exit_status or 0

            if on_output:
                for line in stdout.splitlines():
                    await on_output(line)

            return {
                "stdout": stdout,
                "stderr": stderr,
                "exit_code": exit_code,
                "success": exit_code == 0
            }
    except asyncio.TimeoutError:
        return {"stdout": "", "stderr": "Execution timeout", "exit_code": -1, "success": False}
    except Exception as e:
        return {"stdout": "", "stderr": str(e), "exit_code": -1, "success": False}


async def execute_job_on_hosts(
    hosts: List[dict],  # [{"host": "ip", "resource_id": 1, "username": "root", "password": "xx"}]
    script: str,
    timeout: int = 300,
) -> List[dict]:
    """并发在多台主机上执行作业，返回每台主机的结果"""
    tasks = []
    for h in hosts:
        tasks.append(execute_ssh_command(
            host=h.get("host", ""),
            username=h.get("username", "root"),
            password=h.get("password"),
            private_key=h.get("private_key"),
            command=script,
            timeout=timeout,
        ))

    results = await asyncio.gather(*tasks, return_exceptions=True)

    output = []
    for i, (h, r) in enumerate(zip(hosts, results)):
        if isinstance(r, Exception):
            r = {"stdout": "", "stderr": str(r), "exit_code": -1, "success": False}
        output.append({
            "resource_id": h.get("resource_id"),
            "host": h.get("host"),
            **r,
        })
    return output

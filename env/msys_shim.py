"""绕开 ESP-IDF 的 Git Bash 检测。

idf_tools.py 开头就是 `if 'MSYSTEM' in os.environ: fatal(...)`，
但 MSYSTEM 在 Git Bash 里删不掉（unset / env -u 都无效，会被重新注入），
所以在 Python 进程内把它 pop 掉再执行目标脚本。

用法：
    python msys_shim.py <目标脚本.py> [参数...]
"""
import os
import runpy
import sys

for _k in ('MSYSTEM', 'MSYSCON'):
    os.environ.pop(_k, None)

if len(sys.argv) < 2:
    sys.exit('用法: python msys_shim.py <目标脚本.py> [参数...]')

_target = sys.argv[1]
sys.argv = sys.argv[1:]
# run_path 不会把脚本所在目录加进 sys.path，而 idf_tools.py 要 import 同目录的模块
sys.path.insert(0, os.path.dirname(os.path.abspath(_target)))
runpy.run_path(_target, run_name='__main__')

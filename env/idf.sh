#!/bin/bash
# ESP-IDF v5.5.4 构建包装器（Windows + Git Bash）
#
# 为什么需要它（三个 Windows 坑，都踩过）：
#
# 1. 工具链必须放在【纯 ASCII 路径】。本机用户名是中文「春软」，
#    xtensa 工具链无法在自己的路径里表示中文（gcc 报出来的路径中文全变 ????），
#    结果是 ld 找不到 crt0.o / libgcc / libc，连"编译器 ABI 探测"都过不去。
#    → 所以 IDF_TOOLS_PATH 指到 E:\Espressif\tools，而不是默认的
#      C:\Users\春软\.espressif。（注意装完会多一层：E:\Espressif\tools\tools\...）
#
# 2. idf_tools.py / idf.py / install.bat / export.bat 全都检测 MSYSTEM 环境变量并拒绝运行，
#    而 MSYSTEM 在这台机器的 Git Bash 里 unset 和 env -u 都删不掉（会被重新注入）。
#    → 用 msys_shim.py 在 Python 进程内 pop 掉再执行。
#
# 3. export.bat 同时负责把工具链加进 PATH，绕开它就得自己加。
#
# 用法：  /e/Espressif/idf.sh build
#         /e/Espressif/idf.sh -p COM5 flash monitor
#         /e/Espressif/idf.sh menuconfig

ROOT='/e/Espressif/tools'
T="$ROOT/tools"
PY="$ROOT/python_env/idf5.5_py3.11_env/Scripts/python.exe"

export IDF_PATH='E:\Espressif\esp-idf'
export IDF_TOOLS_PATH='E:\Espressif\tools'
export IDF_PYTHON_ENV_PATH='E:\Espressif\tools\python_env\idf5.5_py3.11_env'
export ESP_ROM_ELF_DIR='E:\Espressif\tools\tools\esp-rom-elfs\20241011'

for d in \
  "$T/cmake/3.30.2/bin" \
  "$T/ninja/1.12.1" \
  "$T/ccache/4.12.1/ccache-4.12.1-windows-x86_64" \
  "$T/xtensa-esp-elf/esp-14.2.0_20260121/xtensa-esp-elf/bin" \
  "$T/riscv32-esp-elf/esp-14.2.0_20260121/riscv32-esp-elf/bin" \
  "$T/esp32ulp-elf/2.38_20240113/esp32ulp-elf/bin" \
  "$T/xtensa-esp-elf-gdb/16.3_20250913/xtensa-esp-elf-gdb/bin" \
  "$T/openocd-esp32/v0.12.0-esp32-20251215/openocd-esp32/bin" \
  "$T/dfu-util/0.11/dfu-util-0.11-win64" \
  "$ROOT/python_env/idf5.5_py3.11_env/Scripts" \
  ; do
  [ -d "$d" ] && PATH="$d:$PATH"
done
export PATH

# ===== ccache：加速重复的全量编译（2026-10-07 加）=====
#
# ⚠️ 必须用环境变量，不能在 CMakeLists.txt 里 set(CCACHE_ENABLE ...)：
#    idf.py 每次都传命令行 -DCCACHE_ENABLE=<0|1>（tools.py 里那句 define_cache_entry），
#    而命令行 -D 的优先级高于 CMakeLists 的 set(... CACHE ...)，会被压掉。
#    真正认的开关就是下面这个环境变量（见 idf_py_actions/core_ext.py 的 envvar）。
export IDF_CCACHE_ENABLE=1
#
# ⚠️ 缓存目录钉到 ASCII 路径：默认会落在 C:\Users\春软\... 的中文路径下，
#    而这个工程当初就是因为 xtensa 工具链在中文路径下报 ???? 才把工具链挪到
#    E:\Espressif —— ccache 同样避开中文路径最省事。
#    （ccache 只读环境变量，不读 CMake 变量，所以只能在这里设。）
export CCACHE_DIR='E:/Espressif/ccache'

exec "$PY" 'E:\Espressif\msys_shim.py' 'E:\Espressif\esp-idf\tools\idf.py' "$@"

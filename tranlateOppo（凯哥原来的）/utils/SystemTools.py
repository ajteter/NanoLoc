# -*- coding: utf-8 -*-


import os


def is_windows_platform():
    import platform
    sysstr = platform.system()
    return sysstr == "Windows"


# 输出0为正确运行。1为出现异常
def run_os_system(makecmd):
    result = os.system(makecmd)
    return result


# 执行的cmd的输出作为值返回
# 读取文本所有内容，并且以数列的格式返回结果，一般配合for in使用
def run_os_popens(makecmd):
    fp = os.popen(makecmd)
    return str(fp.readlines())


# 一次性读取文本中全部的内容，以字符串的形式返回结果
def run_os_popen(makecmd):
    fp = os.popen(makecmd)
    return str(fp.read())

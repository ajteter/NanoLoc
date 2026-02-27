# -*- coding: utf-8 -*-

import Config
from . import SystemTools


def delete_dir(dir):
    print("delete %s" % dir)
    if Config.MAKE_BY_WINDOWS:
        SystemTools.run_os_system("rd /s/q %s" % (dir))
    else:
        SystemTools.run_os_system('rm -rf %s' % dir)




# 删除带有target的文件
def delete_file(file):
    if not exists_file(file):
        return
    os.remove(file)

def delete_files(dir, target):
    if not exists_file(dir):
        return
    for file in os.listdir(dir):
        print("file %s" % file)
        if file.find(target) > 0:
            source_file = os.path.join(dir, file)
            os.remove(source_file)




def list_files(dir,type = ""):
    files = []
    for file in os.listdir(dir):
        if type == "":
            files.append(file)
        elif file.endswith("."+type):
            files.append(file)
            #print("file %s " % (file))
    return files

# 列出是否带有target的文件
def list__target_files(dir, must_target, target, exist_target):
    files = []
    for file in os.listdir(dir):
        print("file %s target %s" % (file, target))
        if must_target != "" and file.find(must_target) < 0:
            continue
        exists = file.find(target) >= 0
        if (exists and exist_target) or (not exists and not exist_target):
            print("file append %s" % file)
            files.append(file)
    return files

def isfile(source_file):
    return os.path.isfile(source_file)

# 拷贝文件夹内所有文件
def copy_files(source_dir, target_dir, traverse=False):
    if Config.MAKE_BY_WINDOWS:
        for file in os.listdir(source_dir):
            source_file = os.path.join(source_dir, file)
            target_file = os.path.join(target_dir, file)
            if os.path.isfile(source_file):
                if not os.path.exists(target_dir):
                    os.makedirs(target_dir)
                if not os.path.exists(target_file) or (
                            os.path.exists(target_file) and (
                                    os.path.getsize(target_file) != os.path.getsize(source_file))):
                    open(target_file, "wb").write(open(source_file, "rb").read())
            if traverse:
                copy_files(source_file, target_file)
    else:
        SystemTools.run_os_system("cp -rf %s %s" % (source_dir, target_dir))


def copy_file(source, target):
    if Config.MAKE_BY_WINDOWS:
        open(target, "wb").write(open(source, "rb").read())
    else:
        SystemTools.run_os_system("cp -rf %s %s" % (source, target))


# 重命名文件
def rename_file(source, target):
    #print("renameFile %s to %s" % (source, target))
    os.rename(source, target)

# 存在文件
def file_size(source):
    if not exists_file(source):
        return 0
    return os.path.getsize(source)

# 存在文件
def exists_file(source):
    return os.path.exists(source)

def extra_full_add(path, type="", folder=True):
    if folder:
        contents = ""
        files =  list_files(path, type)
        for pfile in files:
            contents += read_file(f'{path}\\{pfile}' ) + "\n"
        return contents
    return read_file(path)

# 读取文件
def read_file(source):
    file_object = None
    try:
        file_object = open(source, encoding='utf-8')
        all_the_text = file_object.read()
    except:
        return ""
    finally:
        if file_object is not None:
            file_object.close()
    return all_the_text

def read_file_line(source,lines,symbol=""):
    file_object = None
    lines_text = []
    try:
        file_object = open(source, encoding='utf-8')
        for i in range(0,lines):
            if symbol=="":
                lines_text.append(file_object.readline())
            else:
                lines_text.append(file_object.readline().split(symbol)[0])
    except:
        return ""
    finally:
        if file_object is not None:
            file_object.close()
    return lines_text



def read_file_by_line(source):
    try:
        file_object = open(source, 'r', encoding='utf-8')
        lines = file_object.read().splitlines()
        return lines
    except:
        print(f"err read_file:{source}")
        import traceback
        traceback.print_exc()
        lines =[]
        return lines

def read_file_by_line_part(source,part):
    try:
        file_object = open(source, 'r', encoding='utf-8')
        lines = file_object.read().splitlines()
        part_lines=[]
        for line in lines:
            if len(line)<part:
                part_lines.append(line)
            else:
                part_lines.append(line[-part:])
        return part_lines
    except:
        print(f"err read_file:{source}")
        import traceback
        traceback.print_exc()
        lines =[]
        return lines

def read_file_part(source,lines,symbol=""):
    file_object = None
    lines_text = []
    try:
        file_object = open(source, encoding='utf-8')
        for i in range(0,lines):
            if symbol=="":
                lines_text.append(file_object.readline())
            else:
                lines_text.append(file_object.readline().split(symbol)[0])
    except:
        return ""
    finally:
        if file_object is not None:
            file_object.close()
    return lines_text


def get_file_lines(source):
    # with open(source) as f:
    #     size = sum(1 for _ in f)
    # return size
    if not isfile(source):
        return 0
    from itertools import (takewhile, repeat)
    buffer = 1024 * 1024
    with open(source, encoding='utf-8') as f:
        buf_gen = takewhile(lambda x: x, (f.read(buffer) for _ in repeat(None)))
        l=sum(buf.count('\n') for buf in buf_gen)
        print(f"{source}:{l}")
        return l




# 写文件
def write_file(source, data):
    file_object = None
    try:
        mkdir(os.path.dirname(source))
        file_object = open(source, 'w+', encoding='utf-8')
        file_object.write(data)
    except :
        import traceback
        traceback.print_exc()
        return
    finally:
        if file_object is not None:
            file_object.close()

def append_file(source, data):
    file_object = None
    try:
        mkdir(os.path.dirname(source))
        file_object = open(source, 'a+', encoding='utf-8')
        file_object.write(data)
    except :
        import traceback
        traceback.print_exc()
        return
    finally:
        if file_object is not None:
            file_object.close()


def modify_file(tfile, sstr, rstr, fullword=True):
    file_object = None
    try:
        file_object = open(tfile, 'r', encoding='utf-8')
        lines = file_object.readlines()
        flen = len(lines) - 1
        for i in range(flen):
            if sstr in lines[i]:
                if fullword:
                    lines[i] = lines[i].replace(sstr, rstr)
                else:
                    lines[i] = rstr
        file_object.close()
        file_object = open(tfile, 'w', encoding='utf-8')
        file_object.writelines(lines)
    except:
        import traceback
        traceback.print_exc()
        # print("modifyFile %s ,err sstr %s ,rstr%s" % (tfile, sstr, rstr))
        return
    finally:
        if file_object is not None:
            file_object.close()


def mkdir(path):
    # 去除首位空格
    path = path.strip()
    # 去除尾部 \ 符号
    path = path.rstrip("\\")

    # 判断路径是否存在
    # 存在     True
    # 不存在   False
    isExists = os.path.exists(path)
    # 判断结果
    if not isExists:
        os.makedirs(path)
        return True
    else:
        return False

import os
import shutil




dirsCnt = 0
filesCnt = 0

def delWithCmd(path):
    try:
        if os.path.isfile(path):
            cmd = 'del "'+ path + '" /F'
            print(cmd)
            os.system(cmd)
    except Exception as e:
        print(e)


def deleteDir(dirPath):
    global dirsCnt
    global filesCnt
    for root, dirs, files in os.walk(dirPath, topdown=False):
        for name in files:
            try:
                filesCnt += 1
                filePath = os.path.join(root, name)
                #print('file deleted', filesCnt, filePath)
                os.remove(filePath)
            except Exception as e:
                print(e)
                delWithCmd(filePath)
        for name in dirs:
            try:
                os.rmdir(os.path.join(root, name))
                dirsCnt += 1
            except Exception as e:
                print(e)
    os.rmdir(dirPath)

def delDir(dirPath):
    global dirsCnt
    shutil.rmtree(dirPath)
    dirsCnt += 1
    #print('dir deleted', dirsCnt, dirPath)


def delFile(filePath):
    global filesCnt
    os.remove(filePath)
    filesCnt += 1
    #print('file deleted', filesCnt, filePath)

def delete(path):
    try:
        if os.path.isfile(path):
            delFile(path)
        elif os.path.isdir(path):
            deleteDir(path)
    except Exception as e:
        print(e)


if __name__ == '__main__':
    s=read_file_by_line("D://1.txt")
    for ss in s:
        print(ss[4:])




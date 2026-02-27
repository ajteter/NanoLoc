 # coding=utf-8
import datetime
import os
import time


def is_windows_platform():
	import platform
	sysstr = platform.system()
	return sysstr == "Windows"


CWD = os.getcwd()

# 是否在win环境下编译
MAKE_BY_WINDOWS = is_windows_platform()

if MAKE_BY_WINDOWS:
	FILE_PREFIX = "\\"
else:
	FILE_PREFIX = "/"

def now_time():
	return  datetime.datetime.now()

def now_time_long():
	return int(round(time.time() * 1000))


def timeDelta(time) :
	now_time = now_time_long()
	ms = now_time - time

	ss = 1000

	mi = ss * 60
	hh = mi * 60
	dd = hh * 24
	day = (int)(ms / dd)
	hour = (int)((ms - day * dd) / hh)
	minute = (int)((ms - day * dd - hour * hh) / mi)
	second = (int)((ms - day * dd - hour * hh - minute * mi) / ss)
	milliSecond =(int)( ms - day * dd - hour * hh - minute * mi - second * ss)
	delta_time=""
	if (day > 0) :
		delta_time+=(f"{day}天")

	if (hour > 0) :
		delta_time+=(f"{hour}时")

	if (minute > 0) :
		delta_time+=(f"{minute}分")

	if (second > 0) :
		delta_time+=(f"{second}秒")

	if (milliSecond > 0) :
		delta_time+=(f"{milliSecond}毫秒")

	if (len(delta_time)==0) :
		return "0"
	return delta_time



def getSpeed(startTime,progress) :
	now_time = now_time_long()
	speed = progress *1000.0/ (now_time - startTime)
	if speed>10000:
		speed = speed / 10000
		return f"{round(speed,2)}W/s"
	return f"{round(speed,2)}/s"


#ADDRESS="1MhH5RE2Ty81Zc8rQ1he3rJau7D4u4v8Rs"

DATA_PATH="bitcoin_data"

DEFAULT_TIMEOUT=50



DATA_PATH ='D:\\bitcoin_data\\'

PATH_WIN_TMP_KEY=f"{DATA_PATH}Win_Key_TMP.txt"

PATH_WIN_KEY=f"{DATA_PATH}Win_Key.txt"

PATH_KEY_COIN_INDEX=f"{DATA_PATH}index_check_coin.txt"


if __name__ == '__main__':
	ssss="allmusic://preparePlay/targetId/16206/targetType/30/type/101"
	itargetId = ssss.find("/targetId/")
	if itargetId>=0:
		itargetIdend=ssss.find("/", itargetId + 10)
		if itargetIdend<0:
			print(ssss[itargetId+10:])
		else:
			print(ssss[itargetId+10:itargetIdend])
	itargetType = ssss.find("/targetType/")
	if itargetType >= 0:
		itargetTypeend=ssss.find("/", itargetType + 12)
		if itargetTypeend<0:
			print(ssss[itargetType + 12:])
		else:
			print(ssss[itargetType + 12:itargetTypeend])
	itype = ssss.find("/type/")
	if itype >= 0:
		itypeend = ssss.find("/", itype + 6)
		if itypeend<0:
			print(ssss[itype + 6:])
		else:
			print(ssss[itype + 6:itypeend])



ROOT_PATH = os.path.abspath(os.path.dirname(__file__))
import subprocess


def run( fetcher , url, task, start_time, callback ):
     try:
        c = subprocess.Popen(["casperjs.cmd", "C:\\casperjsrun.js","--url="+url],stdout=subprocess.PIPE)
        ret = c.stdout.read(),
        return ret
     except Exception as e:
        fetcher.handle_error('casperjs',url, task, start_time, callback, e)
        raise  e

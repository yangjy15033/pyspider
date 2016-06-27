// vim: set et sw=2 ts=2 sts=2 ff=unix fenc=utf8:
// Author: Binux<i@binux.me>
//         http://binux.me
// Created on 2014-10-29 22:12:14

var port, server, service,
  wait_before_end = 1000,
  system = require('system'),
  webpage = require('webpage');

if (system.args.length !== 2) {
  console.log('Usage: simpleserver.js <portnumber>');
  phantom.exit(1);
} else {
  port = system.args[1];
  server = require('webserver').create();
  console.debug = function(){};

  service = server.listen(port, {
    'keepAlive': false
  }, function (request, response) {
    //console.debug(JSON.stringify(request, null, 4));
    // check method
    if (request.method == 'GET') {
      body = "method not allowed!";
      response.statusCode = 403;
      response.headers = {
        'Cache': 'no-cache',
        'Content-Length': body.length
      };
      response.write(body);
      response.closeGracefully();
      return;
    }


    var first_response = null,
        finished = false,
        page_loaded = false,
        start_time = Date.now(),
        end_time = null,
        script_executed = false,
        script_result = null;

    var fetch = JSON.parse(request.postRaw);
    console.log(JSON.stringify(fetch, null, 2));

    if( !fetch.js_param.phantom_notclearCookies ){
        console.log( ' phantom.clearCookies();');
        phantom.clearCookies();
    }

    // create and set page
    var page = webpage.create();

    page.viewportSize = {
      width: fetch.js_viewport_width || 1024,
      height: fetch.js_viewport_height || 768*3
    }
    if (fetch.headers) {
      fetch.headers['Accept-Encoding'] = undefined;
      fetch.headers['Connection'] = undefined;
      fetch.headers['Content-Length'] = undefined;
    }
    if (fetch.headers && fetch.headers['User-Agent']) {
      page.settings.userAgent = fetch.headers['User-Agent'];
    }

    // this may cause memory leak: https://github.com/ariya/phantomjs/issues/12903
    page.settings.loadImages = fetch.load_images === undefined ? true : fetch.load_images;
    page.settings.resourceTimeout = fetch.timeout ? fetch.timeout * 1000 : 120*1000;
    if (fetch.headers) {
      page.customHeaders = fetch.headers;
    }


    page.onAlert = function(msg) {
      console.log('page.onAlert' , msg);
    };
    page.onCallback = function(data) {
      script_result = data;
      console.log('page.onCallback' , JSON.stringify(data, null, 2) );

    };
    page.onClosing = function(closingPage) {
      console.log('page.onClosing'  , closingPage.url);
    };
    page.onConfirm = function(msg) {
      console.log('page.onConfirm' , msg);
    };
    page.onConsoleMessage = function(msg, lineNum, sourceId) {
      console.log('page.onConsoleMessage' , msg ,  lineNum , sourceId );
    };
    /**/
    page.onError = function(msg, trace) {
      var msgStack = [ 'page.onError' + msg];
      if (trace && trace.length) {
        msgStack.push('trace:');
        trace.forEach(function(t) {
          msgStack.push(' -> ' + t.file + ': ' + t.line + (t.function ? ' (in function "' + t.function +'")' : ''));
        });
      }
      console.error(msgStack.join('\n'));
      //make_wait_before_end();
    };

    page.onFilePicker = function(oldFile) {
      console.log('page.onFilePicker' , oldFile);
    };
    page.onInitialized = function() {
      console.log('page.onInitialized');
      evaluateJavaScript(true);
    };
    page.onLoadFinished = function(status) {
      page_loaded = true;
      console.log('page.onLoadFinished',status);
      evaluateJavaScript(false);

      make_wait_before_end();
    };
    page.onLoadStarted = function() {
      console.log('page.onLoadStarted' );
      end_time = null;
    };
    page.onNavigationRequested = function(url, type, willNavigate, main) {
      console.debug('page.onNavigationRequested' , url, type, willNavigate, main);
    };
    page.onPageCreated = function(newPage) {
      console.log('page.onPageCreated child page url' , newPage.url);
      // Decorate
      newPage.onClosing = function(closingPage) {
        console.log('A child page is closing: ' + closingPage.url);
      };
    };
    page.onPrompt = function(msg, defaultVal) {
      console.log('page.onPrompt' , msg,defaultVal);
    };
    page.onResourceError = function(resourceError) {
      console.log('page.onResourceError');
      console.log('Unable to load resource (#' + resourceError.id + 'URL:' + resourceError.url + ')');
      console.log('Error code: ' + resourceError.errorCode + '. Description: ' + resourceError.errorString);
      make_wait_before_end();

    };
    page.onResourceReceived = function(response) {
      if (first_response === null && response.status != 301 && response.status != 302) {
        first_response = response;
      }
      console.debug('page.onResourceReceived (#' + response.id + ', stage "' + response.stage + '"): ' + response.url);

    //  make_wait_before_end();
    };
    page.onResourceRequested = function(requestData, networkRequest) {
      //console.debug('page.onResourceRequested (#' + requestData.id + '): ' , requestData.url);

     // end_time = null;
    };
    page.onResourceTimeout = function(request) {
       console.log('page.onResourceTimeout (#' + request.id + '): ' + JSON.stringify(request));
       make_wait_before_end();
    };
    page.onUrlChanged = function(targetUrl) {
      console.log('page.onUrlChanged ' + targetUrl);
    };

    function make_wait_before_end(){
        if( page_loaded ){
           // console.log("waiting "+wait_before_end+"ms before finished.");
            end_time = Date.now() + wait_before_end;
            setTimeout(make_result, wait_before_end+10, page);
        }
    }

    function evaluateJavaScript( isstart )
    {
        var flag = false;
        if ( script_executed ) return ;
        if (!fetch.js_script) return ;

        if( isstart && fetch.js_run_at === "document-start" )
        {
            console.log('evaluateJavaScript on document-start.');
            flag = true;
        }
        if( !isstart && fetch.js_run_at !== "document-start" )
        {
           console.log('evaluateJavaScript on document-end.');
           flag = true;
        }

        if(flag){
          script_executed = true;

          if( fetch.js_param.phantom_jsFrame )
          {
              page.switchToChildFrame(fetch.js_param.phantom_jsFrame)
          }


          if( fetch.js_param.phantom_incejquery )
          {
              console.log( 'page.switchToChildFrame( '+ fetch.js_param.phantom_jsFrame +') ');
              page.switchToChildFrame(fetch.js_param.phantom_jsFrame)
          }



          if( fetch.js_param.phantom_incjquery )
          {

              page.includeJs(
                  // Include the https version, you can change this to http if you like.
                  'https://ajax.googleapis.com/ajax/libs/jquery/1.8.2/jquery.min.js',
                  function() {
                    console.log( 'page.includeJs jquery');
                    page.evaluate( function( fetch ) {
                        $(function(){
                           eval( 'var fetchjs_script='+ fetch.js_script );
                           fetchjs_script();
                        });
                    } , fetch);
                  }
              );
              end_time = null;
              // wait               onCallback
              // window.callPhantom( data );
          }
          else
          {
              console.log('page.evaluateJavaScript start' , fetch.js_script);
              script_result = page.evaluateJavaScript(fetch.js_script);
              console.log('page.evaluateJavaScript end' , script_result);
          }




        /*
          setTimeout( function(page){
              page.switchToChildFrame("play")
              console.log('page.evaluateJavaScript start' , fetch.js_script);
              script_result = page.evaluateJavaScript(fetch.js_script);
              console.log('page.evaluateJavaScript end' , script_result);
          }, 1000, page);*/
        }
    }

    // make sure request will finished
    setTimeout(function(page) {
      make_result(page);
    }, page.settings.resourceTimeout + 100, page);

    // send request
    page.open(fetch.url, {
      operation: fetch.method,
      data: fetch.data,
    });

    // make response
    function make_result(page) {
      if (finished) {
        return;
      }
      if (Date.now() - start_time < page.settings.resourceTimeout) {
        if (!!!end_time) {
          return;
        }
        if (end_time > Date.now()) {
          setTimeout(make_result, Date.now() - end_time, page);
          return;
        }
      }

      var result = {};
      try {
        result = _make_result(page);
      } catch (e) {
        result = {
          orig_url: fetch.url,
          status_code: 599,
          error: e.toString(),
          content:  '',
          headers: {},
          url: page.url,
          cookies: {},
          time: (Date.now() - start_time) / 1000,
          save: fetch.save
        }
      }

      page.close();
      finished = true;
      console.log("["+result.status_code+"] "+result.orig_url+" "+result.time)

      var body = JSON.stringify(result, null, 2);
      response.writeHead(200, {
        'Cache': 'no-cache',
        'Content-Type': 'application/json',
      });
      response.write(body);
      response.closeGracefully();
    }

    function _make_result(page) {
      console.debug( "_make_result", page);
      if (first_response === null) {
        throw "No response received!";
      }

      var cookies = {};
      page.cookies.forEach(function(e) {
        cookies[e.name] = e.value;
      });

      var headers = {};
      if (first_response.headers) {
        first_response.headers.forEach(function(e) {
          headers[e.name] = e.value;
        });
      }

      ret =  {
        orig_url: fetch.url,
        status_code: first_response.status || 599,
        error: first_response.errorString,
        content:  page.content,
        headers: headers,
        url: page.url,
        cookies: cookies,
        time: (Date.now() - start_time) / 1000,
        js_script_result: script_result,
        save: fetch.save
      }
      console.debug( "_make_result", JSON.stringify(ret, null, 4) );

      return ret;
    }
  });

  if (service) {
    console.log('Web server running on port ' + port);
  } else {
    console.log('Error: Could not create web server listening on port ' + port);
    phantom.exit();
  }
}

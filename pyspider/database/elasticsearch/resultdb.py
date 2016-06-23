#!/usr/bin/env python
# -*- encoding: utf-8 -*-
# vim: set et sw=4 ts=4 sts=4 ff=unix fenc=utf8:
# Author: Binux<i@binux.me>
#         http://binux.me
# Created on 2014-10-13 22:18:36

import json
import time
from pymongo import MongoClient
from pyspider.database.base.resultdb import ResultDB as BaseResultDB
from elasticsearch import Elasticsearch

class ResultDB( BaseResultDB):
    collection_prefix = ''

    def __init__(self, url, database='resultdb'):
        self.conn = Elasticsearch()
        self.database = database
        #self.conn.IndicesClient(self.conn).delete(index=self.database);
        #self.save( "afxc2", "sd","http://www.5566.com",{"shopname":"sdfsdfs"} )
        #print self.count( "afxc2" )
        #print self.get( "afxc2" ,  "sd" )
        #self.select( "afxc2" )


    def _parse(self, data):
        return data["_source"]
        #if 'result' in data:
        #    data['result'] = json.loads(data['result'])
        #return data

    def _stringify(self, data):
        if 'result' in data:
            data['result'] = json.dumps(data['result'])
        return data

    def save(self, project, taskid, url, result):
        obj = {
            'taskid': taskid,
            'url': url,
            'result': result,
            'updatetime': time.time(),
        }
        return self.conn.index( index=self.database, doc_type=project, id=taskid, body= obj )

    def select(self, project, fields=None, offset=0, limit=0):
        ret = [];
        if limit==0 :
            limit = 10
        items = self.conn.search( index=self.database, doc_type=project, fields=fields,_source=True , from_=offset,size=limit );
        for item in  items["hits"]["hits"]:
             ret.append( self._parse(item))
        return ret;

    def count(self, project):
        r = self.conn.count(index=self.database, doc_type=project );
        return r['count'];

    def get(self, project, taskid, fields=None):
        return  self.conn.get_source( index=self.database, doc_type=project, id=taskid );


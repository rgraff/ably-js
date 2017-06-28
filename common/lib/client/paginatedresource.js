var PaginatedResource = (function() {

	function getRelParams(linkUrl) {
		var urlMatch = linkUrl.match(/^\.\/(\w+)\?(.*)$/);
		return urlMatch && Utils.parseQueryString(urlMatch[2]);
	}

	function parseRelLinks(linkHeader) {
		if(typeof(linkHeader) == 'string')
			linkHeader = linkHeader.split(',');

		var relParams = {};
		for(var i = 0; i < linkHeader.length; i++) {
			var linkMatch = linkHeader[i].match(/^\s*<(.+)>;\s*rel="(\w+)"$/);
			if(linkMatch) {
				var params = getRelParams(linkMatch[1]);
				if(params)
					relParams[linkMatch[2]] = params;
			}
		}
		return relParams;
	}

	function PaginatedResource(rest, path, headers, envelope, bodyHandler, useHttpPaginatedResponse) {
		this.rest = rest;
		this.path = path;
		this.headers = headers;
		this.envelope = envelope;
		this.bodyHandler = bodyHandler;
		this.useHttpPaginatedResponse = useHttpPaginatedResponse || false;
	}

	PaginatedResource.prototype.get = function(params, callback) {
		var self = this;
		Resource.get(self.rest, self.path, self.headers, params, self.envelope, function(err, body, headers, unpacked, statusCode) {
			self.handlePage(err, body, headers, unpacked, statusCode, callback);
		});
	};

	PaginatedResource.prototype.post = function(params, body, callback) {
		var self = this;
		Resource.post(self.rest, self.path, body, self.headers, params, self.envelope, function(err, resbody, headers, unpacked, statusCode) {
			if(callback) self.handlePage(err, resbody, headers, unpacked, statusCode, callback);
		});
	};

	PaginatedResource.prototype.handlePage = function(err, body, headers, unpacked, statusCode, callback) {
		if(err) {
			Logger.logAction(Logger.LOG_ERROR, 'PaginatedResource.handlePage()', 'Unexpected error getting resource: err = ' + Utils.inspectError(err));
			callback(err);
			return;
		}
		var items, linkHeader, relParams;
		try {
			items = this.bodyHandler(body, headers, unpacked);
		} catch(e) {
			callback(e);
			return;
		}

		if(headers && (linkHeader = (headers['Link'] || headers['link']))) {
			relParams = parseRelLinks(linkHeader);
		}

		if(this.useHttpPaginatedResponse) {
			callback(null, new HttpPaginatedResponse(this, items, headers, statusCode, relParams));
		} else {
			callback(null, new PaginatedResult(this, items, relParams));
		}
	};

	function PaginatedResult(resource, items, relParams) {
		this.resource = resource;
		this.items = items;

		if(relParams) {
			var self = this;
			if('first' in relParams)
				this.first = function(cb) { self.get(relParams.first, cb); };
			if('current' in relParams)
				this.current = function(cb) { self.get(relParams.current, cb); };
			this.next = function(cb) {
				if('next' in relParams)
					self.get(relParams.next, cb);
				else
					cb(null, null);
			};

			this.hasNext = function() { return ('next' in relParams) };
			this.isLast = function() { return !this.hasNext(); }
		}
	}

	/* We assume that only the initial request can be a POST, and that accessing
	 * the rest of a multipage set of results can always be done with GET */
	PaginatedResult.prototype.get = function(params, callback) {
		var res = this.resource;
		Resource.get(res.rest, res.path, res.headers, params, res.envelope, function(err, body, headers, unpacked, statusCode) {
			res.handlePage(err, body, headers, unpacked, statusCode, callback);
		});
	};

	function HttpPaginatedResponse(resource, items, headers, statusCode, relParams) {
		PaginatedResult.call(this, resource, items, relParams);
		this.statusCode = statusCode;
		this.success = statusCode < 300 && statusCode >= 200;
		this.headers = headers;
		/* Note: we don't populate errorCode or errorMessage: for consistency with
		 * the way the rest of the js library works, error data is passed as
		 * ErrorInfos to the err argument of the callback; an  HttpPaginatedResponse
		 * is only ever passed to the callback if there was no error */
	}
	Utils.inherits(HttpPaginatedResponse, PaginatedResult);

	return PaginatedResource;
})();

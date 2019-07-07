L.StaticBBoxGeoJSONLayer = L.GeoJSON.extend({
  options: {
    debug: false,
    light: true,
    usebbox: false,
    baseURL: -1,
		URLSuffix: '.json',
    headers: {},
		minZoom: 13,
    maxRequests: 5,
    pollTime:0,
		lastRequestURL: '',
    once: false,
    transformData: function (data) { return data; },
    afterFetch: function () {},
    after: function (data) {},
  },
  callback: function (data) {
    if(this.options.light) {
      this.clearLayers();//if needed, we clean the layers
    }

    //Then we add the new data
    this.addData(data);
    if (this.options.debug) {
      console.debug('add Data');
    }
		
    this.options.after(data);
  },
  initialize: function (uOptions, options) {
    if (this.options.debug) {
      console.debug('a.initialize');
    }
		
    L.GeoJSON.prototype.initialize.call(this, undefined, options);
    L.Util.setOptions(this, uOptions);

    this._layersOld = [];
    this._requests = [];
  },
  onMoveEnd: function () {
    if (this.options.debug) {
      console.debug('load Data a.onMoveEnd');
    }

    while(this._requests.length > this.options.maxRequests) { //This allows to stop the oldest requests
      this._requests.shift().abort();
    }

    var mapCentre = this._map.getCenter();
    if (this.options.debug) {
      console.debug('a.mapCentre ' + mapCentre.toString());
    }
		var mapLat = floor02(mapCentre.lat);
		var mapLong = floor02(mapCentre.lng);
		var requestURL = this.options.baseURL + "n" + mapLat + "e" + mapLong + this.options.URLSuffix;

		if(this._map.getZoom() < this.options.minZoom)
		{
			if (this.options.debug) {
				console.debug('a.onMoveEnd this.options.minZoom=' + this.options.minZoom);
			}
			return;
		}
		
		if(this.options.light && this.options.lastRequestURL === requestURL)
		{
			if (this.options.debug) {
				console.debug('a.onMoveEnd this.options.lastRequestURL=' + this.options.lastRequestURL);
			}
			return;
		}
		this.options.lastRequestURL = requestURL;

    var self = this;
    var request = new XMLHttpRequest();
    request.open('GET', requestURL, true);
    for(var l in this.options.headers) {
      if (typeof this.options.headers[l].scope !== 'undefined') {
        request.setRequestHeader(l, this.options.headers[l].scope[l]);
      } else {
        request.setRequestHeader(l, this.options.headers[l]);
      }
    }

    request.onload = function() {
      for(var i in self._requests) {
        if(self._requests[i] === request) {
          self._requests.splice(i,1); //We remove the request from the list of currently running requests.
          break;
        }
      }

      if (this.status >= 200 && this.status < 400) {
        var data = JSON.parse(this.responseText);

        if (self.options.transformData) {
          data = self.options.transformData(data);
        }

        self.options.afterFetch();
				if (self.options.debug) {
					console.debug('call back Data');
				}
        self.callback(data);
      }
    };

    this._requests.push(request);

    request.send(null);
  },
  onAdd: function (map) {
    this._map = map;

    if (typeof this.options.baseURL !== 'undefined' && this.options.baseURL !== -1) {
		  this.onMoveEnd();

      if (!this.options.once) {
        map.on('dragend', this.onMoveEnd, this);
        map.on('zoomend', this.onMoveEnd, this);
        map.on('refresh', this.onMoveEnd, this);

        if (this.options.pollTime > 0) {
          this.intervalID = window.setInterval(this.onMoveEnd.bind(this), this.options.pollTime);
        }
      }
    }

    if (this.options.debug) {
      console.debug('add layer');
    }
  },

  onRemove: function (map) {
    if (this.options.debug) {
      console.debug('remove layer');
    }
    L.LayerGroup.prototype.onRemove.call(this, map);

    if (!this.options.once && this.options.pollTime > 0) {
      window.clearInterval(this.intervalID);
    }

    while(this._requests.length > 0) {
      this._requests.shift().abort();
    }

    if(!this.options.once) {
      map.off({
        'dragend': this.onMoveEnd
      }, this);
      map.off({
        'zoomend': this.onMoveEnd
      }, this);
        map.off({
        'refresh': this.onMoveEnd
      }, this);
    }

    this._map = null;
  }
});

L.staticBBoxGeoJSONLayer = function (uOptions, options) {
  return new L.StaticBBoxGeoJSONLayer(uOptions, options);
};

function floor02(x) {
	// Hacky AF
	x = x * 1000;
	x = Math.round(x);
	x = x / 100;
	if(x < 0)
	{
		x = -x;
		//alert(x);
		x = Math.ceil(x);
		//alert(x);
		x = x / 2;
		//alert(x);
		x = Math.ceil(x);
		//alert(x);
		x = x * 2;
		//alert(x);
		x = -x;
		//alert(x);
		return x;
	}
	else
	{
		x = Math.floor(x);
		x = x / 2;
		x = Math.floor(x);
		x = x * 2;
		return x;
	}
}
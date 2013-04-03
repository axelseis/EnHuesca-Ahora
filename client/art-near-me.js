// App

var app = window.app = {};

// App > Constants

app.constants = {
  CANVAS_MIN_ZOOM:        14,
  CANVAS_INIT_ZOOM:       16,
  CANVAS_MAX_ZOOM:        19,
  CANVAS_INIT_LATITUDE:   -27.470544,
  CANVAS_INIT_LONGITUDE:  153.022674,
  IRIS_MIN_RADIUS:        100,
  IRIS_INIT_RADIUS:       250,
  IRIS_MAX_RADIUS:        1500,
  RANGER_CHOICES:         [100, 250, 500, 1000, 1500],
  GEOLOCATION_DISABLED:   0,
  GEOLOCATION_ENABLED:    1,
  GEOLOCATION_LIVE:       2,
  LIVE_REFRESH_INTERVAL:  5000,
  GOOGLE_MAPS_API_KEY:    'AIzaSyAtKXaxcNFs0qemCoEm4V2ytWpSpw2gH08',
  GOOGLE_ANALYTICS_ID:    'UA-31884252-1'
};

// App > Utility Functions

app.utils = {
  rad: function (num) { return num * Math.PI / 180; },
  sqr: function (num) { return num * num; },
  getDistance: function (a, b) {
    var rad = app.utils.rad, sqr = app.utils.sqr, sqrt = Math.sqrt,
        sin = Math.sin, cos = Math.cos, atan2 = Math.atan2, x;
    x = sqr(sin(rad(b.lat() - a.lat()) / 2)) +
        sqr(sin(rad(b.lng() - a.lng()) / 2)) *
        cos(rad(a.lat())) * cos(rad(b.lat()));
    return (2 * atan2(sqrt(x), sqrt(1 - x))) * 6371000;
  }
};

// App > Meteor Collections

app.collections = {
  Artworks: new Meteor.Collection('artworks'),
  Docs: new Meteor.Collection('docs')
};

// App > Map

app.map = {
  canvas: null,
  iris: null,
  markers: {},
  rope: null,
  init: function () {
    var center = new google.maps.LatLng(
      app.constants.CANVAS_INIT_LATITUDE,
      app.constants.CANVAS_INIT_LONGITUDE
    );
    app.map.canvas = new google.maps.Map(document.getElementById('map'), {
      center: center,
      zoom: app.constants.CANVAS_INIT_ZOOM,
      minZoom: app.constants.CANVAS_MIN_ZOOM,
      maxZoom: app.constants.CANVAS_MAX_ZOOM,
      mapTypeId: google.maps.MapTypeId.ROADMAP,
      disableDefaultUI: true
    });
    app.map.iris = new google.maps.Circle({
      strokeColor: '#000000',
      strokeOpacity: 1,
      strokeWeight: 2,
      fillColor: '#000000',
      fillOpacity: 0.1,
      map: app.map.canvas,
      center: center,
      radius: app.constants.IRIS_INIT_RADIUS,
      editable: true
    });
    google.maps.event.addListener(app.map.iris, 'center_changed', function (event) {
      Session.set('isIrisAtUserLocation', (app.map.iris.getCenter() == app.user.location));
      app.map.refresh();
    });
    google.maps.event.addListener(app.map.iris, 'radius_changed', function (event) {
      var iris = app.map.iris;
      var radius = iris.getRadius();
      var minRadius = app.constants.IRIS_MIN_RADIUS;
      var maxRadius = app.constants.IRIS_MAX_RADIUS;
      if (radius < minRadius) {
        iris.setRadius(minRadius);
      } else if (radius > maxRadius) {
        iris.setRadius(maxRadius);
      } else {
        Session.set('range', radius);
        app.map.refresh();
      }
    });
    app.map.rope = new google.maps.Polyline({
      clickable: false,
      map: app.map.canvas,
      path: [center, center],
      strokeColor: '#FF0000',
      strokeOpacity: 0.5,
      strokeWeight: 2
    });
    Session.set('isMapInitialised', true);
  },
  refresh: function () {
    var utils = app.utils;
    var canvas = app.map.canvas;
    var iris = app.map.iris;
    var markers = app.map.markers;
    var rope = app.map.rope;
    var center = iris.getCenter();
    var radius = iris.getRadius();
    var nearest = null;

    function showMarker(artwork, position) {
      var marker = markers[artwork._id];
      if (marker) {
        marker.setVisible(true);
      } else {
        marker = new google.maps.Marker({
          position: position,
          map: canvas,
          title: artwork.title
        });
        google.maps.event.addListener(marker, 'click', function (event) {
          $(Template.artworkModal(artwork)).modal();
        });
        markers[artwork._id] = marker;
      }
    }

    function hideMarker(artwork) {
      markers[artwork._id] && markers[artwork._id].setVisible(false);
    }

    if (Session.get('isArtworksCollectionFetched')) {
      app.collections.Artworks.find({}).forEach(function (artwork) {
        var position, distance;
        position = new google.maps.LatLng(
          artwork.locationLatitude,
          artwork.locationLongitude
        );
        distance = utils.getDistance(center, position);
        (distance < radius ? showMarker : hideMarker)(artwork, position);
        if (nearest === null || distance < nearest.distance) {
          nearest = {
            artwork: artwork,
            position: position,
            distance: distance
          };
        }
      });

      if (nearest !== null) {
        if (nearest.distance >= radius) {
          showMarker(nearest.artwork, nearest.position);
        }
        rope.setPath([center, nearest.position]);
      } else {
        rope.setPath([center, center]);
      }
    }

    canvas.panTo(iris.getCenter());
    setTimeout(function () { canvas.fitBounds(iris.getBounds()); }, 500);
  },
  setRange: function (range) {
    app.map.iris.setRadius(range);
  },
  toggleLiveCanvas: function (on) {
    app.map.canvas.setOptions({
      draggable: !on,
      disableDoubleClickZoom: on,
      keyboardShortcuts: !on,
      scrollwheel: !on
    });
    app.map.iris.setOptions({
      strokeColor: on ? '#0074CC' : '000000',
      editable: !on
    });
  },
  toggleLiveMode: function () {
    if (Session.equals('geolocation', app.constants.GEOLOCATION_ENABLED)) {
      if (Session.get('isIrisAtUserLocation')) {
        app.map.toggleLiveCanvas(true);
        app.user.refreshInterval = setInterval(function () {
          app.user.locateAndFocus();
        }, app.constants.LIVE_REFRESH_INTERVAL);
        Session.set('geolocation', app.constants.GEOLOCATION_LIVE);
      } else {
        app.user.locateAndFocus();
      }
    } else {
      app.map.toggleLiveCanvas(false);
      clearInterval(app.user.refreshInterval);
      Session.set('geolocation', app.constants.GEOLOCATION_ENABLED);
    }
    app.user.locateAndFocus();
  }
};

// App > User

app.user =  {
  location: null,
  refreshInterval: null,
  locate: function (success, failure) {
    var user = app.user;
    var geo = navigator.geolocation;
    geo != null && geo.getCurrentPosition(function (position) {
      user.location = new google.maps.LatLng(
        position.coords.latitude,
        position.coords.longitude
      );
      success && success();
    }, function () {
      Session.set('geolocation', app.constants.GEOLOCATION_DISABLED);
      app.map.iris.setEditable(true);
      failure && failure();
    });
  },
  focus: function () {
    var getDistance = app.utils.getDistance;
    var map = app.map;
    var user = app.user;
    var irisCenter = null;
    var canvasCenter = null;
    if (user.location != null) {
      irisCenter = map.iris.getCenter();
      canvasCenter = map.canvas.getCenter();
      if (getDistance(user.location, canvasCenter) > 10 || getDistance(user.location, irisCenter) > 10) {
        map.iris.setCenter(user.location);
      }
    }
  },
  locateAndFocus: function (failure) {
    app.user.locate(app.user.focus, failure);
  }
};

// App > Initialisation

app.init = function () {
  app.map.init();
  app.map.refresh();
  app.user.locateAndFocus();
};

// Meteor Session Variables

Session.set('range', app.constants.IRIS_INIT_RADIUS);
Session.set('geolocation', app.constants.GEOLOCATION_ENABLED);
Session.set('isMapInitialised', false);
Session.set('isIrisAtUserLocation', false);
Session.set('isArtworksCollectionFetched', false);

// Meteor Templates & Events

Template.ranger.hidden = function () {
  return Session.get('isMapInitialised') ? '' : 'hidden';
};

Template.ranger.range = function () {
  var range = Session.get('range');
  return [Math.floor(range).toString(), 'm'].join('');
};

Template.ranger.ranges = function () {
  return app.constants.RANGER_CHOICES;
};

Template.ranger.events = {
  'click .range': function (event) {
    app.map.setRange($(event.target).data('range'));
    event.preventDefault();
  }
};

Template.locator.hidden = function () {
  return Session.get('isMapInitialised') ? '' : 'hidden';
};

Template.locator.live = function () {
  return Session.equals('geolocation', app.constants.GEOLOCATION_LIVE) ? 'live btn-primary' : 'btn-inverse';
};

Template.locator.disabled = function () {
  return Session.equals('geolocation', app.constants.GEOLOCATION_DISABLED) ? 'disabled' : '';
};

Template.locator.events = {
  'click a': function (event) {
    app.map.toggleLiveMode();
    event.preventDefault();
  }
};

Template.artworkModal.tweet = function () {
  var artworkText;
  if (this.title.length > 30 || this.artistName.length > 21) {
    artworkText = ['"', this.title.substr(0, 55), '"'].join('');
  } else {
    artworkText = ['"', this.title.substr(0, 29), '" by ', this.artistName.substr(0, 20)].join('');
  }
  return [
    'http://twitter.com/share?text=',
    encodeURI([
      'I just discovered ',
      artworkText,
      ' with ArtNearMe Brisbane'
    ].join('')),
    '&url=',
    encodeURI('http://anm.meteor.com'),
    '&via=artnearmeapp'
  ].join('');
};

Template.navDocs.docs = function () {
  return app.collections.Docs.find({});
};

Template.navDocItem.events = {
  'click a': function (event) {
    $(Template.docModal(this)).modal();
    event.preventDefault();
  }
};

// Meteor Subscriptions

Meteor.subscribe('artworks', function () {
  Session.set('isArtworksCollectionFetched', true);
    if (Session.get('isMapInitialised')) {
      app.map.refresh();
    } else {
      setTimeout(function () {
        app.map.refresh();
      }, 3000);
    }
});

Meteor.subscribe('docs');

// Meteor Startup (DOM ready & <body> fully inserted)

Meteor.startup(function () {
  // Nothing yet
});

// Load 3rd Party Scripts (including the all-important Google Maps API that calls app.init once loaded)

;(function(d, s) {

  // Loader
  var fjs = d.getElementsByTagName(s)[0];
  function load(url,id,cb){var js;if(id!=null&&d.getElementById(id)){return;}js=d.createElement(s);js.src=url;js.id=id;if(cb!=null){js.onload=function(){cb(id);};}fjs.parentNode.insertBefore(js,fjs);}

  // Load Google Maps
  load(['//maps.googleapis.com/maps/api/js?key=', app.constants.GOOGLE_MAPS_API_KEY, '&sensor=true&callback=app.init'].join(''), 'googleMapsAPI');

  // Load Google Analytics
  window._gaq = window._gaq || [];
  _gaq.push(['_setAccount', app.constants.GOOGLE_ANALYTICS_ID]);
  _gaq.push(['_trackPageview']);
  if (window.location.hostname != 'localhost') {
    load([('https:' == document.location.protocol ? 'https://ssl' : 'http://www'), '.google-analytics.com/ga.js'].join(''), 'googleAnalyticsAPI');
  }

  // Load Twitter API
  // load('//platform.twitter.com/widgets.js', 'twitterAPI');

}(document, 'script'));

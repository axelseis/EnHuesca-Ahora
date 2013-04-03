Meteor.startup(function () {
  var fs, path, mainPath, staticPath, csvPath, csv, data, fixUnder, fixOver, Handlebars;

  fs = __meteor_bootstrap__.require('fs');
  path = __meteor_bootstrap__.require('path');
  mainPath = __meteor_bootstrap__.require.main.filename;
  staticPath = [mainPath.substr(0, mainPath.length-7), 'static'].join('');

  if (Artworks.find().count() === 0) {
    csvPath = [staticPath, '/art.csv'].join('');
    csv = fs.readFileSync(csvPath, 'utf8');
    data = {};

    fixUnder = function (item) {
      var fixed = [item[0], item[1]];
      var moreItems = _.csv('\t')(item[2]);
      _(moreItems).chain().map(fixOver).each(function (subItem) {
        _(subItem).each(function (text) {
          fixed.push(text);
        });
      });
      fixed.length == 13 && fixed.push('');
      return fixed;
    };

    fixOver = function (item) {
      var fixed = [''];
      _(item).each(function (text) {
        var last = fixed[fixed.length]
        if (text.indexOf(' ') === 0) {
          last = [last, text].join('')
        } else {
          fixed.push(text);
        }
      });
      fixed.shift();
      return fixed;
    };

    // _.csv  underscore mixin (created from jQuery.csv by replacing jQuery with _ and jQuery.extend with _.mixin)
    (function(){function p(a){return function(c){return c.split(a)}}function q(a,c,f,i){return function(e){e=e.split(c);for(var g=[],d,b=0,h=e.length;b<h;b++)if(d=e[b].match(f)){d=d[0];for(var j=b;j<h;j++)if(e[j].charAt(e[j].length-1)==d)break;b=e.slice(b,j+1).join(a);b=b.replace(i[d],d);g.push(b.substr(1,b.length-2));b=j}else g.push(e[b]);return g}}function m(a,c,f){a=typeof a=="undefined"?",":a;c=typeof c=="undefined"?'"':c;f=typeof f=="undefined"?"\r\n":f;for(var i=c?c.split(""):[],e=RegExp("["+a+"]"),g=RegExp("^["+c+"]"),d=0,b={},h;h=i[d];d++)b[h]=RegExp(h+h,"g");return[RegExp("["+f+"]*$"),RegExp("["+f+"]["+f+"]*"),c?q(a,e,g,b):p(e)]}if("a,,b".split(",").length<3){var n=n||String.prototype.split;String.prototype.split=function(a,c){if(!(a instanceof RegExp))return n.apply(this,arguments);if(c===undefined||+c<0)c=false;else{c=Math.floor(+c);if(!c)return[]}var f=(a.global?"g":"")+(a.ignoreCase?"i":"")+(a.multiline?"m":""),i=RegExp("^"+a.source+"$",f),e=[],g=0,d=0,b;for(a.global||(a=RegExp(a.source,"g"+f));(!c||d++<=c)&&(b=a.exec(this));){if((f=!b[0].length)&&a.lastIndex>b.index)a.lastIndex=b.index;if(a.lastIndex>g){b.length>1&&b[0].replace(i,function(){for(var h=1;h<arguments.length-2;h++)if(arguments[h]===undefined)b[h]=undefined});e=e.concat(this.slice(g,b.index),b.index===this.length?[]:b.slice(1));g=a.lastIndex}f&&a.lastIndex++}return g===this.length?a.test("")?e:e.concat(""):c?e:e.concat(this.slice(g))}}_.mixin({csv:function(a,c,f){a=m(a,c,f);var i=a[0],e=a[1],g=a[2];return function(d){d=d.replace(i,"").split(e);for(var b=0,h=d.length;b<h;b++)d[b]=g(d[b]);return d}},csv2json:function(a,c,f){a=m(a,c,f);var i=a[0],e=a[1],g=a[2];return function(d){d=d.replace(i,"").split(e);for(var b=g(d[0]),h=b.length,j=[],l=1,r=d.length;l<r;l++){for(var s=g(d[l]),k=0,o={};k<h;k++)o[b[k]]=s[k];j.push(o)}return j}}})})(_);

    data.all = _.csv(',\t', '"', '\n')(csv);
    data.ok = _(data.all).filter(function (item) {
      return item.length == 14;
    });
    data.under = _(data.all).filter(function (item) {
      return item.length < 14;
    });
    data.over = _(data.all).filter(function (item) {
      return item.length > 14;
    });
    data.underFixed = _(data.under).map(fixUnder);
    data.overFixed = _(data.over).map(fixOver);
    data.unioned = _.union(data.ok, data.underFixed, data.overFixed);
    data.normalised = _(data.unioned).map(function (item) {
      return _(item).map(function (text) {
        if (text[text.length-1] === ',') {
          text = text.substr(0,text.length-1);
        }
        return text;
      });
    });

    _(data.normalised).chain().rest().each(function (item) {
      var objectType;
      objectType = item[7].replace(/\/Public Art/g, '');
      objectType = objectType.replace(/\/MoB/g, '');
      Artworks.insert({
        artistName:         item[0],
        title:              item[1],
        briefDescription:   item[2],
        mediaAndMaterials:  item[3],
        productionDate:     item[4],
        measurements:       item[5],
        installation:       item[6],
        objectType:         objectType,
        subject:            item[8],
        theme:              item[9],
        locationStreet:     item[10],
        locationSuburb:     item[11],
        locationLatitude:   item[12],
        locationLongitude:  item[13]
      });
    });
  }

  if (Docs.find().count() === 0) {
    _([
      {
        order: 0,
        title: 'About',
        body: fs.readFileSync([staticPath, '/about.html'].join(''), 'utf8')
      }
    ]).each(function (item) {
      Docs.insert({
        order: item.order,
        title: item.title,
        body: item.body
      });
    });
  }

  // Lock down collection writes
  _.each(['artworks', 'docs'], function(collection) {
    _.each(['insert', 'update', 'remove'], function(method) {
      Meteor.default_server.method_handlers['/' + collection + '/' + method] = function() {};
    });
  });
});

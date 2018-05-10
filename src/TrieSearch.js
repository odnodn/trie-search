var HashArray = require('hasharray');

var MAX_CACHE_SIZE = 64;

var DEFAULT_INTERNATIONALIZE_EXPAND_REGEXES = [
  {
    regex: /[åäàáâãæ]/uig,
    alternate: 'a'
  },
  {
    regex: /[èéêë]/uig,
    alternate: 'e'
  },
  {
    regex: /[ìíîï]/uig,
    alternate: 'i'
  },
  {
    regex: /[òóôõö]/uig,
    alternate: 'o'
  },
  {
    regex: /[ùúûü]/uig,
    alternate: 'u'
  },
  {
    regex: /[æ]/uig,
    alternate: 'ae'
  }
];

String.prototype.replaceCharAt=function(index, replacement) {
  return this.substr(0, index) + replacement + this.substr(index + replacement.length);
};

var TrieSearch = function (keyFields, options) {
  this.options = options || {};

  // Default ignoreCase to true
  this.options.ignoreCase = (this.options.ignoreCase === undefined) ? true : this.options.ignoreCase;
  this.options.maxCacheSize = this.options.maxCacheSize || MAX_CACHE_SIZE;
  this.options.cache = this.options.hasOwnProperty('cache') ? this.options.cache : true;
  this.options.splitOnRegEx = this.options.hasOwnProperty('splitOnRegEx') ? this.options.splitOnRegEx : /\s/g;
  this.options.min = this.options.min || 1;
  this.options.keepAll = this.options.hasOwnProperty('keepAll') ? this.options.keepAll : false;
  this.options.keepAllKey = this.options.hasOwnProperty('keepAllKey') ? this.options.keepAllKey : 'id';
  this.options.idFieldOrFunction = this.options.hasOwnProperty('idFieldOrFunction') ? this.options.idFieldOrFunction : undefined;
  this.options.expandRegexes = this.options.expandRegexes || DEFAULT_INTERNATIONALIZE_EXPAND_REGEXES;

  this.keyFields = keyFields ? (keyFields instanceof Array ? keyFields : [keyFields]) : [];
  this.root = {};
  this.size = 0;

  if (this.options.cache) {
    this.getCache = new HashArray('key');
  }
};

function deepLookup(obj, keys) {
  return keys.length === 1 ? obj[keys[0]] : deepLookup(obj[keys[0]], keys.slice(1, keys.length));
}

TrieSearch.prototype = {
  add: function (obj, customKeys) {
    if (this.options.cache)
      this.clearCache();

    // Someone might have called add via an array forEach where the second param is a number
    if (typeof customKeys === 'number') {
      customKeys = undefined;
    }

    var keyFields = customKeys || this.keyFields;

    for (var k in keyFields)
    {
      var key = keyFields[k],
        isKeyArr = key instanceof Array,
        val = isKeyArr ? deepLookup(obj, key) : obj[key];

      if (!val) continue;

      val = val.toString();
      val = this.options.ignoreCase ? val.toLowerCase() : val;

      let expandedValues = this.expandString(val);

      for (let v = 0; v < expandedValues.length; v++) {
        expandedValue = expandedValues[v];

        this.map(expandedValue, obj);
      }
    }
  },
  /**
   * By default using the options.expandRegexes, given a string like 'ö är bra', this will expand it to:
   *
   * ['ö är bra', 'o är bra', 'ö ar bra', 'o ar bra']
   *
   * By default this was built to allow for internationalization, but it could be also be expanded to
   * allow for word alternates, etc. like spelling alternates ('teh' and 'the').
   *
   * This is used for insertion! This should not be used for lookup since if a person explicitly types
   * 'ä' they probably do not want to see all results for 'a'.
   *
   * @param value The string to find alternates for.
   * @returns {Array} Always returns an array even if no matches.
   */
  expandString: function(value) {
    var values = [value];

    if (this.options.expandRegexes && this.options.expandRegexes.length) {
      for (let i = 0; i < this.options.expandRegexes.length; i++) {
        var er = this.options.expandRegexes[i];
        let match;

        while((match = er.regex.exec(value)) !== null) {
          let alternateValue = value.replaceCharAt(match.index, er.alternate);
          values.push(alternateValue);
        }
      }
    }

    return values;
  },
  addAll: function (arr, customKeys) {
    for (var i = 0; i < arr.length; i++)
      this.add(arr[i], customKeys);
  },
  reset: function () {
    this.root = {};
    this.size = 0;
  },
  clearCache: function () {
    // if (this.getCache && !this.getCache._list.length) {
    //   return;
    // }
    this.getCache = new HashArray('key');
  },
  cleanCache: function () {
    while (this.getCache.all.length > this.options.maxCacheSize)
      this.getCache.remove(this.getCache.all[0]);
  },
  addFromObject: function (obj, valueField) {
    if (this.options.cache)
      this.clearCache();

    valueField = valueField || 'value';

    if (this.keyFields.indexOf('_key_') == -1)
      this.keyFields.push('_key_');

    for (var key in obj)
    {
      var o = {_key_: key};
      o[valueField] = obj[key];
      this.add(o);
    }
  },
  map: function (key, value) {
    if (this.options.splitOnRegEx && this.options.splitOnRegEx.test(key))
    {
      var phrases = key.split(this.options.splitOnRegEx);

      for (var i = 0, l = phrases.length; i < l; i++)
        this.map(phrases[i], value);

      return;
    }

    if (this.options.cache)
      this.clearCache();

    if (this.options.keepAll) {
      this.indexed = this.indexed || new HashArray([this.options.keepAllKey]);
      this.indexed.add(value);
    }

    if (this.options.ignoreCase) {
      key = key.toLowerCase();
    }

    var keyArr = this.keyToArr(key),
      self = this;

    insert(keyArr, value, this.root);

    function insert(keyArr, value, node) {
      if (keyArr.length == 0)
      {
        node['value'] = node['value'] || [];
        node['value'].push(value);
        return; 
      }

      var k = keyArr.shift();

      if (!node[k])
        self.size++;

      node[k] = node[k] || {};

      insert(keyArr, value, node[k])
    }
  },
  keyToArr: function (key) {
    var keyArr;
      
    if (this.options.min && this.options.min > 1)
    {
      if (key.length < this.options.min)
        return [];

      keyArr = [key.substr(0, this.options.min)];
      keyArr = keyArr.concat(key.substr(this.options.min).split(''));
    }
    else keyArr = key.split('');

    return keyArr;
  },
  findNode: function (key) {
    if (this.options.min > 0 && key.length < this.options.min)
      return [];

    return f(this.keyToArr(key), this.root);

    function f(keyArr, node) {
      if (!node) return undefined;
      if (keyArr.length == 0) return node;

      var k = keyArr.shift();
      return f(keyArr, node[k]);
    }
  },
  _get: function (phrase) {
    phrase = this.options.ignoreCase ? phrase.toLowerCase() : phrase;
    
    var c, node;
    if (this.options.cache && (c = this.getCache.get(phrase)))
      return c.value;

    var ret = undefined,
      haKeyFields = this.options.indexField ? [this.options.indexField] : this.keyFields,
      words = this.options.splitOnRegEx ? phrase.split(this.options.splitOnRegEx) : [phrase];

    for (var w = 0, l = words.length; w < l; w++)
    {
      if (this.options.min && words[w].length < this.options.min)
        continue;

      var temp = new HashArray(haKeyFields);

      if (node = this.findNode(words[w]))
        aggregate(node, temp);

      ret = ret ? ret.intersection(temp) : temp;
    }
    
    var v = ret ? ret.all : [];

    if (this.options.cache)
    {
      this.getCache.add({key: phrase, value: v});
      this.cleanCache();
    }

    return v;
    
    function aggregate(node, ha) {
      if (node.value && node.value.length)
        ha.addAll(node.value);

      for (var k in node)
        if (k != 'value')
          aggregate(node[k], ha);
    }
  },
  get: function (phrases, reducer) {
    var self = this,
      haKeyFields = this.options.indexField ? [this.options.indexField] : this.keyFields,
      ret = undefined,
      accumulator = undefined;

    if (reducer && !this.options.idFieldOrFunction) {
      throw new Error('To use the accumulator, you must specify and idFieldOrFunction');
    }

    phrases = (phrases instanceof Array) ? phrases : [phrases];

    for (var i = 0, l = phrases.length; i < l; i++)
    {
      var matches = this._get(phrases[i]);

      if (reducer) {
        accumulator = reducer(accumulator, phrases[i], matches, this);
      } else {
        ret = ret ? ret.addAll(matches) : new HashArray(haKeyFields).addAll(matches);
      }
    }

    if (!reducer) {
      return ret.all;
    }

    return accumulator;
  },
  getId: function (item) {
    return typeof this.options.idFieldOrFunction === 'function' ? this.options.idFieldOrFunction(item) : item[this.options.idFieldOrFunction];
  }
};

TrieSearch.UNION_REDUCER = function(accumulator, phrase, matches, trie) {
  if (accumulator === undefined) {
    return matches;
  }

  var map = {}, i, id;
  var maxLength = Math.max(accumulator.length, matches.length);
  var results = [];
  var l = 0;

  // One loop, O(N) for max length of accumulator or matches.
  for (i = 0; i < maxLength; i++) {
    if (i < accumulator.length) {
      id = trie.getId(accumulator[i]);
      map[id] = map[id] ? map[id] : 0;
      map[id]++;

      if (map[id] === 2) {
        results[l++] = accumulator[i];
      }
    }

    if (i < matches.length) {
      id = trie.getId(matches[i]);
      map[id] = map[id] ? map[id] : 0;
      map[id]++;

      if (map[id] === 2) {
        results[l++] = matches[i];
      }
    }
  }

  return results;
};

module.exports = TrieSearch;

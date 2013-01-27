/**
 * Convert to object string. {a:1} to {"a":1}.
 */

function convertToObjStr (m) {
  return '"' + m.replace(':', '') + '":';
}

/**
 * Convert JSON REST style string to JSON object.
 *
 * @param {String} str
 * @return {Object}
 */

exports.toJSON = function (str) {
  var json = {};
  for (var i = 0, l = str.length; i < l; i++) {
    if (0 === i % 2) {
      json[str[i]] = '';
    } else {
      if (!isNaN(parseFloat(str[i])) && isFinite(str[i])) {
        json[str[i-1]] = parseFloat(str[i]);
      } else if ('[' === str[i][0] && ']' === str[i][str[i].length-1] || '{' === str[i][0] && '}' === str[i][str[i].length-1]) {
        if ('{' === str[i][0] && '}' === str[i][str[i].length-1]) {
          str[i] = str[i].replace(/\w+\:/g, convertToObjStr);
        }
        json[str[i-1]] = JSON.parse(str[i]);
      } else if ('true' === str[i] || 'false' === str[i]) {
        json[str[i-1]] = 'true' === str[i] || !('false' === str[i]);
      } else {
        json[str[i-1]] = str[i];
      }
    }
  }
  return json;
};
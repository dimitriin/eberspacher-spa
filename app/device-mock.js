/**
 * Created by nasedkin on 07.02.16.
 */
(function(){
    'use strict';
    angular.module('device', []).factory('device',[function(){
        return {
            location: {
                lat: function() { return 55.1;  },
                lon: function() { return 82.55; }
            },
            storage: {
                setDataValue: function (key, value) {
                    localStorage.setItem(String(key), String(value));
                },
                getDataValue: function (key) {
                    return localStorage.getItem(String(key));
                }
            },
            time: {
                currentTimestamp: function() {
                    var now = function() { return new Date().getTime(); };
                    return now() / 1000 | 0;
                }
            },
            notification: {
                box: function(message) {
                   alert(message);
                },
                sound: function() {
                    alert('biiiiip');
                }
            }
        }
    }]);
})();
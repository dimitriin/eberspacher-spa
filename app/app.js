/**
 * Created by nasedkin on 03.02.16.
 */

(function(){

    var app = angular.module('eberspacher', ['ngResource', 'ngRoute', 'stopwatch', 'device']);

    app.config(['$routeProvider',
        function($routeProvider) {
            $routeProvider.
            when('/main', {
                templateUrl: 'app/views/main.html',
                controller: 'HeaterController'
            }).
            when('/settings', {
                templateUrl: 'app/views/settings.html',
                controller: 'SettingsController'
            }).
            otherwise({
                redirectTo: '/main'
            });
        }]);

    app.factory('heater',['device', 'dateFilter', function (device, dateFilter) {
        return {
            getSettingsHeaterPlayDuration: function () {
                return device.storage.getDataValue('settings.heater.playDuration') || '30'
            },

            setSettingsHeaterPlayDuration: function (value) {
                return device.storage.setDataValue('settings.heater.playDuration', value);
            },

            getLastHeaterStart: function () {
                return device.storage.getDataValue('last.heater.start') || 0;
            },

            getHeaterStatus: function() {
                var status = device.storage.getDataValue('last.heater.status') || 'off';
                if( status == 'on' ) {
                    var stop    = parseInt(this.getLastHeaterStop());
                    var current = parseInt(device.time.currentTimestamp());
                    if( current < stop ) {
                        return 'on';
                    }
                }
                return 'off';
            },

            isHeaterOn: function() {
                return this.getHeaterStatus() == 'on';
            },

            setOnHeaterStatus: function () {
                if( !this.isHeaterOn() ) {
                    var playDuration = parseInt(this.getSettingsHeaterPlayDuration());
                    var now = parseInt(device.time.currentTimestamp());
                    var stop = now + playDuration * 60;

                    device.storage.setDataValue('last.heater.status', 'on');
                    device.storage.setDataValue('last.heater.playDuration', playDuration);
                    device.storage.setDataValue('last.heater.start', now);
                    device.storage.setDataValue('last.heater.stop', stop);

                    return true;
                } else {
                    return false;
                }
            },

            setOffHeaterStatus: function () {
                if( this.isHeaterOn() ) {
                    device.storage.setDataValue('last.heater.status', 'off');
                    device.storage.setDataValue('last.heater.stop', device.time.currentTimestamp());
                    return true;
                } else {
                    return false;
                }
            },

            getLastHeaterPlayDuration: function () {
                return device.storage.getDataValue('last.heater.playDuration') || this.getSettingsHeaterPlayDuration();
            },

            getLastHeaterStop: function () {
                return device.storage.getDataValue('last.heater.stop') || device.time.currentTimestamp();
            },

            getRealHeaterPlayDuration: function() {
                var diff = new Date(parseInt(this.getLastHeaterStop())*1000 - parseInt(this.getLastHeaterStart())*1000);
                return dateFilter(diff, 'mm');
            },

            getEasyStartTextPhone: function() {
                return device.storage.getDataValue('settings.heater.easyStartText.phone') || '';
            },

            setEasyStartTextPhone: function(phone) {
                device.storage.setDataValue('settings.heater.easyStartText.phone', phone);
            },

            onSoundNotificationOnComplete: function () {
                device.storage.setDataValue('settings.heater.soundNotificationOnComplete', 'on');
            },

            offSoundNotificationOnComplete: function () {
                device.storage.setDataValue('settings.heater.soundNotificationOnComplete', 'off');
            },

            isSoundNotificationOnComplete: function () {
                var s = device.storage.getDataValue('settings.heater.soundNotificationOnComplete') || 'on';
                return s == 'on';ß
            }
        };
    }]);

    app.factory('weather',['$resource', function($resource){
        return $resource('http://api.openweathermap.org/data/2.5/weather', {}, {
            query: {method:'GET', params: {appid:'44db6a862fba0b067b1930da0d769e98', units: 'metric'}}
        });
    }]);

    app.controller('HeaterController', ['$scope', '$location', 'heater', 'weather', 'device', 'dateFilter', function ($scope, $location, heater, weather, device, dateFilter) {

        $scope.isCurrentControl = function(checking) {
            return $scope.currentControl == checking;
        };

        $scope.setCurrentControl = function(control) {
            $scope.currentControl = control;
        };

        $scope.setSettingsHeaterPlayDuration = function(duration) {
            heater.setSettingsHeaterPlayDuration(duration);
        };

        $scope.heaterOn = function () {
            if( !heater.getEasyStartTextPhone() ) {
                $location.path('/settings').search({
                    phoneNeeded: true
                });
            }
            heater.setOnHeaterStatus();
            $scope.setCurrentControl('on');
        };

        $scope.heaterOff = function () {
            heater.setOffHeaterStatus();
            $scope.setCurrentControl('off');
            return heater.setOffHeaterStatus();
        };

        $scope.$on('stopwatch-completed', function (event, data) {
            if( $scope.heaterOff() && heater.isSoundNotificationOnComplete() ) {
                device.notification.sound();
            }
        });

        $scope.lastHeaterPlayDuration  = heater.getLastHeaterPlayDuration();
        $scope.$watch(function(){ return heater.getLastHeaterPlayDuration(); }, function (newValue, oldValue) {
            if (newValue !== oldValue) {
                $scope.lastHeaterPlayDuration = newValue;
            }
        });

        $scope.realHeaterPlayDuration = heater.getRealHeaterPlayDuration();
        $scope.$watch(function () { return heater.getRealHeaterPlayDuration(); }, function (newValue, oldValue) {
            if (newValue !== oldValue) {
                $scope.realHeaterPlayDuration = newValue;
            }
        });

        $scope.heaterStopTimestamp = parseInt(heater.getLastHeaterStop()) * 1000;
        $scope.$watch(function () { return heater.getLastHeaterStop(); }, function (newValue, oldValue) {
            if (newValue !== oldValue) {
                $scope.heaterStopTimestamp = parseInt(newValue) * 1000;
            }
        });

        $scope.settingsHeaterPlayDuration = heater.getSettingsHeaterPlayDuration();
        $scope.$watch(function () { return heater.getSettingsHeaterPlayDuration(); }, function (newValue, oldValue) {
            if (newValue !== oldValue) {
                $scope.settingsHeaterPlayDuration = newValue;
            }
        });

        $scope.lastHeaterPlayTime = dateFilter(new Date(parseInt(heater.getLastHeaterStop())*1000), 'MM.dd H:mm');

        if( heater.isHeaterOn() ) {
            $scope.currentControl = 'on';
        } else {
            $scope.currentControl = 'off';
        }

        $scope.city = '';
        $scope.country = '';
        $scope.temp = '';

        weather.query({lat: device.location.lat() , lon: device.location.lon()}, function(data) {
            $scope.city = data.name;
            $scope.country = data.sys.country;
            $scope.temp = data.main.temp;
        });
    }]);

    app.controller('SettingsController', ['$scope', '$location', 'heater', 'device', function ($scope, $location, heater, device) {
        $scope.phoneNumber       = heater.getEasyStartTextPhone();
        $scope.soundNotification = heater.isSoundNotificationOnComplete();

        $scope.savePhoneNumber = function() {
            heater.setEasyStartTextPhone($scope.phoneNumber);
        };

        $scope.saveSoundNotification = function() {
            if( $scope.soundNotification ) {
                heater.onSoundNotificationOnComplete();
            } else {
                heater.offSoundNotificationOnComplete();
            }
        };

        if( $location.search().phoneNeeded ) {
            device.notification.box("Before start, please, fill easy start text phone number.");
        }

    }]);

})();
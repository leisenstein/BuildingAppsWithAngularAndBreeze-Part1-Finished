(function () {
    'use strict';
    var controllerId = 'dashboard';
    angular.module('app').controller(controllerId, ['common', 'datacontext', dashboard]);

    function dashboard(common, datacontext) {
        var getLogFn = common.logger.getLogFn;
        var log = getLogFn(controllerId);

        var vm = this;
        vm.news = {
            title: 'Code Camp',
            description: 'Code Camp in Atlanta, Georgia on March 15, 2015.'
        };
        vm.sessionCount = 0;
        vm.attendeeCount = 0;
        vm.speakerCount = 0;
        vm.content = {
            title: 'Content',
            tracks: [],  
            predicate: '',
            reverse: false,
            setSort: setContentSort  
        };

        vm.map = {
            title : 'Location'
        };

        vm.speakers = {
            interval: 5000,
            list: [],
            title: 'Top Speakers'
        };
        
        vm.title = 'Dashboard';

        activate();

        function activate() {
            getTopSpeakers();
            // All the promises must resolve before moving to next step
            var promises = [getAttendeeCount(), getSessionCount(), getSpeakerCount(), getTrackCounts()];
            common.activateController(promises, controllerId)
                .then(function () { log('Activated Dashboard View'); });



        }
        function getAttendeeCount() {
            return datacontext.getAttendeeCount().then(function (data) {
                return vm.attendeeCount = data;
            });
        }

        function getSessionCount() {
            return datacontext.getSessionCount().then(function (data) {
                return vm.sessionCount = data;
            });
        }

        function getTrackCounts() {
            return datacontext.getTrackCounts().then(function (data) {
                return vm.content.tracks = data;
            });
        }

        function getTopSpeakers() {
            vm.speakers.list = datacontext.getSpeakersTopLocal();
        }

        function getSpeakerCount() {
            var speakers = datacontext.getSpeakersLocal();
            vm.speakerCount = speakers.length;
        }

        function setContentSort(prop) {
            vm.content.predicate = prop;
            vm.content.reverse = !vm.content.reverse;
        }

        
    }
})();
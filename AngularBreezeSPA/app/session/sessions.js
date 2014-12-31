(function () {
    'use strict';

    // Controller name is handy for logging
    var controllerId = 'sessions';
    angular
        .module('app').controller(controllerId,
            ['$routeParams', 'common', 'config', 'datacontext', sessions]);  //dependencies

    // sessions.$inject = ['$location']; 

    function sessions($routeParams, common, config, datacontext) {
        /* jshint validthis:true */
        var vm = this;
        var keyCodes = config.keyCodes;

        var getLogFn = common.logger.getLogFn;
        var log = getLogFn(controllerId);

        var applyFilter = function () { };

        vm.refresh = refresh;
        vm.title = 'Sessions';
        vm.filteredSessions = [];
        vm.sessionsSearch = $routeParams.search || '';
        vm.sessionsFilter = sessionsFilter;
        vm.search = search;
        vm.sessions = [];
        activate();

        function activate() {
                var promises = [getSessions()];
                common.activateController(promises, controllerId)
                    .then(function () {
                        // createSearchThrottle uses values by convention, via its parameters
                        // vm.sessionsSearch is where the user enters the search
                        // vm.sessions is the original unfiltered array
                        // vm.filteredSessions is the filtered array
                        // vm.sessionsFilter is the filtering function


                        applyFilter = common.createSearchThrottle(vm, 'sessions');
                        if (vm.sessionsFilter) {
                            applyFilter(true);
                        }
                        log('Activated Sessions View');
                    });
        }

       

        function getSessions(forceRefresh) {
            return datacontext.getSessionPartials(forceRefresh)
                .then(function (data) {
                    // vm.sessions = data;
                    return vm.sessions = vm.filteredSessions = data;
            });

        }

        function refresh() {
            getSpeakers(true);
        }

        function search($event) {
            // keyCode in config.js
            if ($event.keyCode === keyCodes.esc) { 
                vm.sessionsSearch = '';
                applyFilter(true);  // apply filter without delay
            }
            else {
                applyFilter();  // apply filter with delay
            }
            
        }

        

        function sessionsFilter(session) {
            var textContains = common.textContains; // shortcut variable to textContains function in common library
            var searchText = vm.sessionsSearch;
            var isMatch = searchText ?
                    textContains(session.title, searchText)
                    || textContains(session.tagsFormatted, searchText)
                    || textContains(session.room.name, searchText)
                    || textContains(session.track.name, searchText)
                    || textContains(session.speaker.fullName, searchText)
                : true;

            return isMatch;
        }


    }
})();

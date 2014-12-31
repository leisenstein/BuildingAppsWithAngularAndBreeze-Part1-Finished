(function () {
    'use strict';


    // Controller name is handy for logging
    var controllerId = 'attendees';

    angular.module('app').controller(controllerId, ['common','config', 'datacontext' , attendees]);

    
    function attendees(common, config, datacontext) {
        var vm = this;
        var getLogFn = common.logger.getLogFn;
        var log = getLogFn(controllerId);
        var keyCodes = config.keyCodes;

        vm.attendees = [];
        vm.attendeeCount = 0;
        vm.attendeeFilteredCount = 0;
        vm.attendeeSearch = '';
        vm.filteredAttendees = [];
        vm.search = search;
        vm.pageChanged = pageChanged;
        vm.paging = {
            currentPgae: 1,
            maxPagesToShow: 5,
            pageSize: 15
        };
        // define a calculated Property
        Object.defineProperty(vm.paging, 'pageCount', {
            get: function () {
                return Math.floor(vm.attendeeFilteredCount / vm.paging.pageSize) + 1;
            }
        });



        vm.title = 'Attendees';
        vm.attendees = [];
        vm.refresh = refresh;
        
        // Call activate() as soon as it starts
        activate();

        function activate() {
            var promises = [getAttendees()];
            common.activateController(promises, controllerId)
                    .then(function () { log('Activated Attendees View'); });


        }


        function getAttendeeCount() {
            return datacontext.getAttendeeCount().then(function (data) {
                return vm.attendeeCount = data;
            });
        }

        function getAttendeeFilteredCount() {
            vm.attendeeFilteredCount = datacontext.getFilteredCount(vm.attendeeSearch);


        }

        function getAttendees(forceRefresh) {
            return datacontext.getAttendees(forceRefresh, vm.paging.currentPage, vm.paging.pageSize, vm.attendeeSearch)
            .then(function (data) {
                    // in the callback after getting the data back on local cache (by breeze)
                    vm.attendees = data;
                    getAttendeeFilteredCount();

                    if(!vm.attendeeCount || forceRefresh) {
                        getAttendeeCount();
                    }
                    return data;
                }
            );

        }

        function refresh() {
            getAttendees(true);
        }

        function search($event) {
            if ($event.keyCode === keyCodes.esc) {
                vm.attendeeSearch = '';

            }
            getAttendees();
        }

        function pageChanged(page) {
            if (!page) { return; }
            vm.paging.currentPage = page;
            getAttendees();
        }


    }
})();

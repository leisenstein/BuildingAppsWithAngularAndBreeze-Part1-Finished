(function () {
    'use strict';

    var serviceId = 'datacontext';
    angular.module('app').factory(serviceId, ['common', 'entityManagerFactory', 'model', datacontext]);

    function datacontext(common, emFactory, model) {
        var Predicate = breeze.Predicate;
        var EntityQuery = breeze.EntityQuery;
        var entityNames = model.entityNames;
        var getLogFn = common.logger.getLogFn;
        var log = getLogFn(serviceId);
        var logError = getLogFn(serviceId, 'error');
        var logSuccess = getLogFn(serviceId, 'success');
        var manager = emFactory.newManager();
        var primePromise;
        var $q = common.$q;

        var storeMeta = {
            isLoaded: {
                sessions: false,
                attendees: false
            }
        };

      


        var service = {
            getAttendees: getAttendees,
            getAttendeeCount: getAttendeeCount,
            getSessionCount: getSessionCount,
            getSpeakersLocal: getSpeakersLocal,
            getFilteredCount: getFilteredCount,
            getPeople: getPeople,
            getTrackCounts: getTrackCounts,
            getSessionPartials: getSessionPartials,
            getSpeakerPartials: getSpeakerPartials,
            getSpeakersTopLocal: getSpeakersTopLocal,
            prime: prime
        };

        return service;

        
        function getPeople() {
            var people = [
                { firstName: 'John', lastName: 'Papa', age: 25, location: 'Florida' },
                { firstName: 'Ward', lastName: 'Bell', age: 31, location: 'California' },
                { firstName: 'Colleen', lastName: 'Jones', age: 21, location: 'New York' },
                { firstName: 'Madelyn', lastName: 'Green', age: 18, location: 'North Dakota' },
                { firstName: 'Ella', lastName: 'Jobs', age: 18, location: 'South Dakota' },
                { firstName: 'Landon', lastName: 'Gates', age: 11, location: 'South Carolina' },
                { firstName: 'Haley', lastName: 'Guthrie', age: 35, location: 'Wyoming' }
            ];
            return $q.when(people);
        }

        function getAttendees(forceRemote, page, size, nameFilter) {
            var orderBy = 'firstName, lastName';
            // var attendees = [];

            var take = size || 20;
            var skip = page ? (page - 1) * size : 0;

            if (_areAttendeesLoaded() && !forceRemote) {
                // get data locally
                return $q.when(getByPage()); // return a promise for the data we need
                // attendees = _getAllLocal(entityNames.attendee, orderBy);
                // return $q.when(attendees);
            }


            return EntityQuery.from('Persons')
                .select('id, firstName, lastName, imageSource')
                .orderBy(orderBy)
                .toType(entityNames.attendee) // entityType
                .using(manager).execute()
                .then(querySucceeded, _queryFailed);

            function getByPage() {
                var predicate = null;
                if (nameFilter) {
                    predicate = _fullNamePredicate(nameFilter);
                }
                var attendees = EntityQuery.from(entityNames.attendee)
                    .where(predicate)
                    .take(take)
                    .skip(skip)
                    .orderBy(orderBy)
                    .using(manager)
                    .executeLocally();

                return attendees;
            }


            function querySucceeded(data) {
                _areAttendeesLoaded(true);
                log('Retrieved [Attendees] from remote data source', data.results.length, true);
                return getByPage();
            }
        }

        function getAttendeeCount() {
            if (_areAttendeesLoaded()) {
                return $q.when(_getLocalEntityCount('Persons'));
            }

            return EntityQuery.from('Persons')
                .take(0)
                .inlineCount()
                .using(manager)
                .execute()
                .to$q(_getInlineCount); 

        }


        function getSessionCount() {
            if (_areSessionsLoaded()) {
                return $q.when(_getLocalEntityCount(entityNames.session));
            }

            return EntityQuery.from('Sessions')
                .take(0)
                .inlineCount()
                .using(manager)
                .execute()
                .to$q(_getInlineCount);

        }

        function getTrackCounts() {
            return getSessionPartials().then(function (data) {
                var sessions = data;
                // loop thru and create track counter
                var trackMap = sessions.reduce(function (accum, session) {
                    var trackName = session.track.name;
                    var trackId = session.track.id;
                    if (accum[trackId - 1]) {
                        accum[trackId - 1].count++;
                    } else {
                        accum[trackId - 1] = {
                            track: trackName,
                            count: 1
                        };
                    }
                    return accum;
                }, []);
                return trackMap;
            });
        }


        function getSpeakersTopLocal() {
            var orderBy = 'firstName, lastName';
            var predicate = Predicate.create('lastName', '==', 'Papa')
                            .or('lastName', '==', 'Guthrie')
                            .or('lastName', '==', 'Bell')
                            .or('lastName', '==', 'Hanselman')
                            .or('lastName', '==', 'Lerman')
                            .and('isSpeaker', '==', true);

            return _getAllLocal(entityNames.speaker, orderBy, predicate);
        }

        function getSpeakersLocal() {
            var orderBy = 'firstName, lastName';
            var predicate = Predicate.create('isSpeaker', '==', true);

            return _getAllLocal(entityNames.speaker, orderBy, predicate);

        }

        function _getInlineCount(data) {
            return data.inlineCount;
        }

        function _getLocalEntityCount(resource) {
            var entities = EntityQuery.from(resource)
                .using(manager)
                .executeLocally();

            return entities.length;
        }

        function getFilteredCount(nameFilter) {
            var predicate = _fullNamePredicate(nameFilter);

            var attendees = EntityQuery.from(entityNames.attendee)
                    .where(predicate)
                    .using(manager)
                    .executeLocally();

            return attendees.length;

        }


        function _fullNamePredicate(filterValue) {
            return breeze.Predicate
                .create('firstName', 'contains', filterValue)
                .or('lastName', 'contains', filterValue);
        }


        function getSpeakerPartials(forceRemote) {
            var predicate = breeze.Predicate.create('isSpeaker', '==', true);
            var orderBy = 'firstName, lastName';
            var speakers = [];

            if (!forceRemote) {  // speakers are primed, so they are always loaded at first
                // get data locally
                speakers = _getAllLocal(entityNames.speaker, orderBy, predicate);
                return $q.when(speakers);
            }


            return EntityQuery.from('Speakers')
                .select('id, firstName, lastName, imageSource')
                .orderBy(orderBy)
                .toType(entityNames.speaker) // entityType
                .using(manager).execute()
                .then(querySucceeded, _queryFailed);


            function querySucceeded(data) {
                speakers = data.results;
                for (var i = 0; i < speakers.length; i++) {
                    speakers[i].isSpeaker = true;
                }
                log('Retrieved [Speaker Partials] from remote data source', speakers.length, true);
                return speakers;
            }
        }

        function getSessionPartials(forceRemote) {
            var orderBy = 'timeSlotId, level, speaker.firstName';
            var sessions;

            if (_areSessionsLoaded() && !forceRemote) {
                // get data locally
                sessions = _getAllLocal(entityNames.session, orderBy);
                return $q.when(sessions);
            }


            return EntityQuery.from('Sessions')
                .select('id, title, code, speakerId, trackId, timeSlotId, roomId, level, tags')
                .orderBy(orderBy)
                .toType(entityNames.session)
                .using(manager).execute()
                .then(querySucceeded, _queryFailed);

            function querySucceeded(data) {
                sessions = data.results;
                _areSessionsLoaded(true);
                log('Retrieved [Session Partials] from remote data source', sessions.length, true);
                return sessions;
            }
                
        }

        function prime() {
            // if it exists, return it. else, init it.  Singleton.
            if (primePromise) return primePromise;  
            primePromise = $q.all([getLookups(), getSpeakerPartials(true)])
                .then(extendMetadata)
                .then(success);
            return primePromise;

            function success() {
                setLookups();
                log('Primed the data');
            }

            function extendMetadata() {
                var metadataStore = manager.metadataStore;
                var types = metadataStore.getEntityTypes();
                types.forEach(function (type) {
                    if(type instanceof breeze.EntityType) {
                        set(type.shortName, type);
                    }
                });

                var personEntityName = entityNames.person; // from enum type object above
                ['Speakers', 'Speaker', 'Attendees', 'Attendee'].forEach(function (r) {
                    set(r, personEntityName);
                });


                function set(resourceName, entityName) {
                    metadataStore.setEntityTypeForResourceName(resourceName, entityName);
                }
            }
        }

        function setLookups() {
            


            service.lookupCachedData = {
                rooms: _getAllLocal(entityNames.room, 'name'), // [],
                tracks: _getAllLocal(entityNames.track, 'name'),// [],
                timeslots: _getAllLocal(entityNames.timeslot, 'start'),
            };
        }

        function _getAllLocal(resource, ordering, predicate) {
            return EntityQuery.from(resource)
                .orderBy(ordering)
                .where(predicate)
                .using(manager)
                .executeLocally();
        }

        function getLookups() {
            return EntityQuery.from('Lookups')
                .using(manager).execute()
                .then(querySucceeded, _queryFailed);

            function querySucceeded(data) {
                // Breeze caches the data locally, in memory
                // Handy for data that is used throughout your app
                log('Retrieved [Lookups]', data.length, true);
                // not returning data and not exposing as service b/c it is cached
                return true;
            }
        }




        function _queryFailed(error) {
            var msg = config.appErrorPrefix + 'Error retrieving data.' + error.message;
            logError(msg, error);
            throw error;
        }


        function _areSessionsLoaded(value) {
            return _areItemsLoaded('sessions', value);
        }

        function _areSpeakersLoaded(value) {
            return _areItemsLoaded('speakers', value);
        }

        function _areAttendeesLoaded(value) {
            return _areItemsLoaded('attendees', value);
        }


        function _areItemsLoaded(key, value) {
            if (value === undefined) {
                return storeMeta.isLoaded[key]; // get
            }
            return storeMeta.isLoaded[key] = value; // set
        }

    }
})();
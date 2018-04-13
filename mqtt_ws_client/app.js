var websocketclient_1 = {
    'client': null,
    'lastMessageId': 1,
    'lastSubId': 1,
    'subscriptions': [],
    'messages': [],
    'connected': false,

    'connect': function (index) {
        var index = 1;
        var host = $('#urlInput_'+index).val();
        var port = parseInt($('#portInput_'+index).val(), 10);
        var clientId = $('#clientIdInput_'+index).val();
        var username = $('#userInput_'+index).val();
        var password = $('#pwInput_'+index).val();
        var keepAlive = parseInt($('#keepAliveInput_'+index).val());
        var cleanSession = $('#cleanSessionInput_'+index).is(':checked');
        var lwTopic = $('#lwTopicInput_'+index).val();
        var lwQos = parseInt($('#lwQosInput_'+index).val());
        var lwRetain = $('#LWRInput_'+index).is(':checked');
        var lwMessage = $('#LWMInput_'+index).val();
        var ssl = $('#sslInput_'+index).is(':checked');

        this.client = new Messaging.Client(host, port, clientId);
        this.client.onConnectionLost = this.onConnectionLost;
        this.client.onMessageArrived = this.onMessageArrived;

        var options = {
            timeout: 3,
            keepAliveInterval: keepAlive,
            cleanSession: cleanSession,
            useSSL: ssl,
            onSuccess: this.onConnect,
            onFailure: this.onFail
        };

        if (username.length > 0) {
            options.userName = username;
        }
        if (password.length > 0) {
            options.password = password;
        }
        if (lwTopic.length > 0) {
            var willmsg = new Messaging.Message(lwMessage);
            willmsg.qos = lwQos;
            willmsg.destinationName = lwTopic;
            willmsg.retained = lwRetain;
            options.willMessage = willmsg;
        }

        this.client.connect(options);
    },

    'onConnect': function () {
        websocketclient_1.connected = true;
        console.log("connected");
        var body = $('#sub_content_1').addClass('connected').removeClass('notconnected').removeClass('connectionbroke');

        websocketclient_1.render.hide('conni');
        websocketclient_1.render.show('publish');
        websocketclient_1.render.show('sub');
        websocketclient_1.render.show('messages');
    },

    'onFail': function (message) {
        websocketclient_1.connected = false;
        console.log("error: " + message.errorMessage);
        websocketclient_1.render.showError('Connect failed: ' + message.errorMessage);
    },

    'onConnectionLost': function (responseObject) {
        websocketclient_1.connected = false;
        if (responseObject.errorCode !== 0) {
            console.log("onConnectionLost:" + responseObject.errorMessage);
        }
        $('#sub_content_1.connected').removeClass('connected').addClass('notconnected').addClass('connectionbroke');
        websocketclient_1.render.show('conni');
        websocketclient_1.render.hide('publish');
        websocketclient_1.render.hide('sub');
        websocketclient_1.render.hide('messages');

        //Cleanup messages
        websocketclient_1.messages = [];
        websocketclient_1.render.clearMessages();

        //Cleanup subscriptions
        websocketclient_1.subscriptions = [];
        websocketclient_1.render.clearSubscriptions();
    },

    'onMessageArrived': function (message) {
//        console.log("onMessageArrived:" + message.payloadString + " qos: " + message.qos);

        var subscription = websocketclient_1.getSubscriptionForTopic(message.destinationName);

        var messageObj = {
            'topic': message.destinationName,
            'retained': message.retained,
            'qos': message.qos,
            'payload': message.payloadString,
            'timestamp': moment(),
            'subscriptionId': subscription.id,
            'color': websocketclient_1.getColorForSubscription(subscription.id)
        };

        console.log(messageObj);
        messageObj.id = websocketclient_1.render.message(messageObj);
        websocketclient_1.messages.push(messageObj);
    },

    'disconnect': function () {
        this.client.disconnect();
    },

    'publish': function (topic, payload, qos, retain) {

        if (!websocketclient_1.connected) {
            websocketclient_1.render.showError("Not connected");
            return false;
        }

        var message = new Messaging.Message(payload);
        message.destinationName = topic;
        message.qos = qos;
        message.retained = retain;
        this.client.send(message);
    },

    'subscribe': function (topic, qosNr, color) {

        if (!websocketclient_1.connected) {
            websocketclient_1.render.showError("Not connected");
            return false;
        }

        if (topic.length < 1) {
            websocketclient_1.render.showError("Topic cannot be empty");
            return false;
        }

        if (_.find(this.subscriptions, { 'topic': topic })) {
            websocketclient_1.render.showError('You are already subscribed to this topic');
            return false;
        }

        this.client.subscribe(topic, {qos: qosNr});
        if (color.length < 1) {
            color = '999999';
        }

        var subscription = {'topic': topic, 'qos': qosNr, 'color': color};
        subscription.id = websocketclient_1.render.subscription(subscription);
        this.subscriptions.push(subscription);
        return true;
    },

    'unsubscribe': function (id) {
        var subs = _.find(websocketclient_1.subscriptions, {'id': id});
        this.client.unsubscribe(subs.topic);
        websocketclient_1.subscriptions = _.filter(websocketclient_1.subscriptions, function (item) {
            return item.id != id;
        });

        websocketclient_1.render.removeSubscriptionsMessages(id);
    },

    'deleteSubscription': function (id) {
        var elem = $("#sub_1" + id);

        if (confirm('Wirklich löschen ?')) {
            elem.remove();
            this.unsubscribe(id);
        }
    },

    'getRandomColor': function () {
        var r = (Math.round(Math.random() * 255)).toString(16);
        var g = (Math.round(Math.random() * 255)).toString(16);
        var b = (Math.round(Math.random() * 255)).toString(16);
        return r + g + b;
    },

    'getSubscriptionForTopic': function (topic) {
        var i;
        for (i = 0; i < this.subscriptions.length; i++) {
            if (this.compareTopics(topic, this.subscriptions[i].topic)) {
                return this.subscriptions[i];
            }
        }
        return false;
    },

    'getColorForPublishTopic': function (topic) {
        var id = this.getSubscriptionForTopic(topic);
        return this.getColorForSubscription(id);
    },

    'getColorForSubscription': function (id) {
        try {
            if (!id) {
                return '99999';
            }

            var sub = _.find(this.subscriptions, { 'id': id });
            if (!sub) {
                return '999999';
            } else {
                return sub.color;
            }
        } catch (e) {
            return '999999';
        }
    },

    'compareTopics': function (topic, subTopic) {
        var pattern = subTopic.replace("+", "(.+?)").replace("#", "(.*)");
        var regex = new RegExp("^" + pattern + "$");
        return regex.test(topic);
    },

    'render': {

        'showError': function (message) {
            alert(message);
        },
        'messages': function () {

            websocketclient_1.render.clearMessages();
            _.forEach(websocketclient_1.messages, function (message) {
                message.id = websocketclient_1.render.message(message);
            });

        },
        'message': function (message) {

            var largest = websocketclient_1.lastMessageId++;

            var html = '<li class="messLine id="' + largest + '">' +
                '   <div class="row large-12 mess' + largest + '" style="border-left: solid 10px #' + message.color + '; ">' +
                '       <div class="large-12 columns messageText">' +
                '           <div class="large-3 columns date">' + message.timestamp.format("YYYY-MM-DD HH:mm:ss") + '</div>' +
                '           <div class="large-5 columns topicM truncate" id="topicM' + largest + '" title="' + Encoder.htmlEncode(message.topic, 0) + '">Topic: ' + Encoder.htmlEncode(message.topic) + '</div>' +
                '           <div class="large-2 columns qos">Qos: ' + message.qos + '</div>' +
                '           <div class="large-2 columns retain">';
            if (message.retained) {
                html += 'Retained';
            }
            html += '           </div>' +
                '           <div class="large-12 columns message break-words">' + Encoder.htmlEncode(message.payload) + '</div>' +
                '       </div>' +
                '   </div>' +
                '</li>';
            $("#messEdit_1").prepend(html);
            return largest;
        },

        'subscriptions': function () {
            websocketclient_1.render.clearSubscriptions();
            _.forEach(websocketclient_1.subscriptions, function (subs) {
                subs.id = websocketclient_1.render.subscription(subs);
            });
        },

        'subscription': function (subscription) {
            var largest = websocketclient_1.lastSubId++;
            $("#innerEdit_1").append(
                '<li class="subLine" id="sub_1' + largest + '">' +
                    '   <div class="row large-12 subs' + largest + '" style="border-left: solid 10px #' + subscription.color + '; background-color: #ffffff">' +
                    '       <div class="large-12 columns subText">' +
                    '           <div class="large-1 columns right closer">' +
                    '              <a href="#" onclick="websocketclient_1.deleteSubscription(' + largest + '); return false;">x</a>' +
                    '           </div>' +
                    '           <div class="qos">Qos: ' + subscription.qos + '</div>' +
                    '           <div class="topic truncate" id="topic' + largest + '" title="' + Encoder.htmlEncode(subscription.topic, 0) + '">' + Encoder.htmlEncode(subscription.topic) + '</div>' +
                    '       </div>' +
                    '   </div>' +
                    '</li>');
            return largest;
        },

        'toggleAll': function () {
            websocketclient_1.render.toggle('conni');
            websocketclient_1.render.toggle('publish');
            websocketclient_1.render.toggle('messages');
            websocketclient_1.render.toggle('sub');
        },

        'toggle': function (name) {
            $('.' + name + 'Arrow' + '_1').toggleClass("closed");
            $('.' + name + 'Top' + '_1').toggleClass("closed");
            var elem = $('#' + name + 'Main' + '_1');
            elem.slideToggle();
        },

        'hide': function (name) {
            $('.' + name + 'Arrow' + '_1').addClass("closed");
            $('.' + name + 'Top' + '_1').addClass("closed");
            var elem = $('#' + name + 'Main' + '_1');
            elem.slideUp();
        },

        'show': function (name) {
            $('.' + name + 'Arrow' + '_1').removeClass("closed");
            $('.' + name + 'Top' + '_1').removeClass("closed");
            var elem = $('#' + name + 'Main' + '_1');
            elem.slideDown();
        },

        'removeSubscriptionsMessages': function (id) {
            websocketclient_1.messages = _.filter(websocketclient_1.messages, function (item) {
                return item.subscriptionId != id;
            });
            websocketclient_1.render.messages();
        },

        'clearMessages': function () {
            $("#messEdit_1").empty();
        },

        'clearSubscriptions': function () {
            $("#innerEdit_1").empty();
        }
    }
};


var websocketclient_2 = {
    'client': null,
    'lastMessageId': 1,
    'lastSubId': 1,
    'subscriptions': [],
    'messages': [],
    'connected': false,

    'connect': function () {
        var index = 2;
        var host = $('#urlInput_'+index).val();
        var port = parseInt($('#portInput_'+index).val(), 10);
        var clientId = $('#clientIdInput_'+index).val();
        var username = $('#userInput_'+index).val();
        var password = $('#pwInput_'+index).val();
        var keepAlive = parseInt($('#keepAliveInput_'+index).val());
        var cleanSession = $('#cleanSessionInput_'+index).is(':checked');
        var lwTopic = $('#lwTopicInput_'+index).val();
        var lwQos = parseInt($('#lwQosInput_'+index).val());
        var lwRetain = $('#LWRInput_'+index).is(':checked');
        var lwMessage = $('#LWMInput_'+index).val();
        var ssl = $('#sslInput_'+index).is(':checked');

        this.client = new Messaging.Client(host, port, clientId);
        this.client.onConnectionLost = this.onConnectionLost;
        this.client.onMessageArrived = this.onMessageArrived;

        var options = {
            timeout: 3,
            keepAliveInterval: keepAlive,
            cleanSession: cleanSession,
            useSSL: ssl,
            onSuccess: this.onConnect,
            onFailure: this.onFail
        };

        if (username.length > 0) {
            options.userName = username;
        }
        if (password.length > 0) {
            options.password = password;
        }
        if (lwTopic.length > 0) {
            var willmsg = new Messaging.Message(lwMessage);
            willmsg.qos = lwQos;
            willmsg.destinationName = lwTopic;
            willmsg.retained = lwRetain;
            options.willMessage = willmsg;
        }

        this.client.connect(options);
    },

    'onConnect': function () {
        websocketclient_2.connected = true;
        console.log("connected");
        var body = $('#sub_content_2').addClass('connected').removeClass('notconnected').removeClass('connectionbroke');

        websocketclient_2.render.hide('conni');
        websocketclient_2.render.show('publish');
        websocketclient_2.render.show('sub');
        websocketclient_2.render.show('messages');
    },

    'onFail': function (message) {
        websocketclient_2.connected = false;
        console.log("error: " + message.errorMessage);
        websocketclient_2.render.showError('Connect failed: ' + message.errorMessage);
    },

    'onConnectionLost': function (responseObject) {
        websocketclient_2.connected = false;
        if (responseObject.errorCode !== 0) {
            console.log("onConnectionLost:" + responseObject.errorMessage);
        }
        $('#sub_content_2.connected').removeClass('connected').addClass('notconnected').addClass('connectionbroke');
        websocketclient_2.render.show('conni');
        websocketclient_2.render.hide('publish');
        websocketclient_2.render.hide('sub');
        websocketclient_2.render.hide('messages');

        //Cleanup messages
        websocketclient_2.messages = [];
        websocketclient_2.render.clearMessages();

        //Cleanup subscriptions
        websocketclient_2.subscriptions = [];
        websocketclient_2.render.clearSubscriptions();
    },

    'onMessageArrived': function (message) {
//        console.log("onMessageArrived:" + message.payloadString + " qos: " + message.qos);

        var subscription = websocketclient_2.getSubscriptionForTopic(message.destinationName);

        var messageObj = {
            'topic': message.destinationName,
            'retained': message.retained,
            'qos': message.qos,
            'payload': message.payloadString,
            'timestamp': moment(),
            'subscriptionId': subscription.id,
            'color': websocketclient_2.getColorForSubscription(subscription.id)
        };

        console.log(messageObj);
        messageObj.id = websocketclient_2.render.message(messageObj);
        websocketclient_2.messages.push(messageObj);
    },

    'disconnect': function () {
        this.client.disconnect();
    },

    'publish': function (topic, payload, qos, retain) {

        if (!websocketclient_2.connected) {
            websocketclient_2.render.showError("Not connected");
            return false;
        }

        var message = new Messaging.Message(payload);
        message.destinationName = topic;
        message.qos = qos;
        message.retained = retain;
        this.client.send(message);
    },

    'subscribe': function (topic, qosNr, color) {

        if (!websocketclient_2.connected) {
            websocketclient_2.render.showError("Not connected");
            return false;
        }

        if (topic.length < 1) {
            websocketclient_2.render.showError("Topic cannot be empty");
            return false;
        }

        if (_.find(this.subscriptions, { 'topic': topic })) {
            websocketclient_2.render.showError('You are already subscribed to this topic');
            return false;
        }

        this.client.subscribe(topic, {qos: qosNr});
        if (color.length < 1) {
            color = '999999';
        }

        var subscription = {'topic': topic, 'qos': qosNr, 'color': color};
        subscription.id = websocketclient_2.render.subscription(subscription);
        this.subscriptions.push(subscription);
        return true;
    },

    'unsubscribe': function (id) {
        var subs = _.find(websocketclient_2.subscriptions, {'id': id});
        this.client.unsubscribe(subs.topic);
        websocketclient_2.subscriptions = _.filter(websocketclient_2.subscriptions, function (item) {
            return item.id != id;
        });

        websocketclient_2.render.removeSubscriptionsMessages(id);
    },

    'deleteSubscription': function (id) {
        var elem = $("#sub_2" + id);

        if (confirm('Wirklich löschen ?')) {
            elem.remove();
            this.unsubscribe(id);
        }
    },

    'getRandomColor': function () {
        var r = (Math.round(Math.random() * 255)).toString(16);
        var g = (Math.round(Math.random() * 255)).toString(16);
        var b = (Math.round(Math.random() * 255)).toString(16);
        return r + g + b;
    },

    'getSubscriptionForTopic': function (topic) {
        var i;
        for (i = 0; i < this.subscriptions.length; i++) {
            if (this.compareTopics(topic, this.subscriptions[i].topic)) {
                return this.subscriptions[i];
            }
        }
        return false;
    },

    'getColorForPublishTopic': function (topic) {
        var id = this.getSubscriptionForTopic(topic);
        return this.getColorForSubscription(id);
    },

    'getColorForSubscription': function (id) {
        try {
            if (!id) {
                return '99999';
            }

            var sub = _.find(this.subscriptions, { 'id': id });
            if (!sub) {
                return '999999';
            } else {
                return sub.color;
            }
        } catch (e) {
            return '999999';
        }
    },

    'compareTopics': function (topic, subTopic) {
        var pattern = subTopic.replace("+", "(.+?)").replace("#", "(.*)");
        var regex = new RegExp("^" + pattern + "$");
        return regex.test(topic);
    },

    'render': {

        'showError': function (message) {
            alert(message);
        },
        'messages': function () {

            websocketclient_2.render.clearMessages();
            _.forEach(websocketclient_2.messages, function (message) {
                message.id = websocketclient_2.render.message(message);
            });

        },
        'message': function (message) {

            var largest = websocketclient_2.lastMessageId++;

            var html = '<li class="messLine id="' + largest + '">' +
                '   <div class="row large-12 mess' + largest + '" style="border-left: solid 10px #' + message.color + '; ">' +
                '       <div class="large-12 columns messageText">' +
                '           <div class="large-3 columns date">' + message.timestamp.format("YYYY-MM-DD HH:mm:ss") + '</div>' +
                '           <div class="large-5 columns topicM truncate" id="topicM' + largest + '" title="' + Encoder.htmlEncode(message.topic, 0) + '">Topic: ' + Encoder.htmlEncode(message.topic) + '</div>' +
                '           <div class="large-2 columns qos">Qos: ' + message.qos + '</div>' +
                '           <div class="large-2 columns retain">';
            if (message.retained) {
                html += 'Retained';
            }
            html += '           </div>' +
                '           <div class="large-12 columns message break-words">' + Encoder.htmlEncode(message.payload) + '</div>' +
                '       </div>' +
                '   </div>' +
                '</li>';
            $("#messEdit_2").prepend(html);
            return largest;
        },

        'subscriptions': function () {
            websocketclient_2.render.clearSubscriptions();
            _.forEach(websocketclient_2.subscriptions, function (subs) {
                subs.id = websocketclient_2.render.subscription(subs);
            });
        },

        'subscription': function (subscription) {
            var largest = websocketclient_2.lastSubId++;
            $("#innerEdit_2").append(
                '<li class="subLine" id="sub_2' + largest + '">' +
                    '   <div class="row large-12 subs' + largest + '" style="border-left: solid 10px #' + subscription.color + '; background-color: #ffffff">' +
                    '       <div class="large-12 columns subText">' +
                    '           <div class="large-1 columns right closer">' +
                    '              <a href="#" onclick="websocketclient_2.deleteSubscription(' + largest + '); return false;">x</a>' +
                    '           </div>' +
                    '           <div class="qos">Qos: ' + subscription.qos + '</div>' +
                    '           <div class="topic truncate" id="topic' + largest + '" title="' + Encoder.htmlEncode(subscription.topic, 0) + '">' + Encoder.htmlEncode(subscription.topic) + '</div>' +
                    '       </div>' +
                    '   </div>' +
                    '</li>');
            return largest;
        },

        'toggleAll': function () {
            websocketclient_2.render.toggle('conni');
            websocketclient_2.render.toggle('publish');
            websocketclient_2.render.toggle('messages');
            websocketclient_2.render.toggle('sub');
        },

        'toggle': function (name) {
            $('.' + name + 'Arrow' + '_2').toggleClass("closed");
            $('.' + name + 'Top' + '_2').toggleClass("closed");
            var elem = $('#' + name + 'Main' + '_2');
            elem.slideToggle();
        },

        'hide': function (name) {
            $('.' + name + 'Arrow' + '_2').addClass("closed");
            $('.' + name + 'Top' + '_2').addClass("closed");
            var elem = $('#' + name + 'Main' + '_2');
            elem.slideUp();
        },

        'show': function (name) {
            $('.' + name + 'Arrow' + '_2').removeClass("closed");
            $('.' + name + 'Top' + '_2').removeClass("closed");
            var elem = $('#' + name + 'Main' + '_2');
            elem.slideDown();
        },

        'removeSubscriptionsMessages': function (id) {
            websocketclient_2.messages = _.filter(websocketclient_2.messages, function (item) {
                return item.subscriptionId != id;
            });
            websocketclient_2.render.messages();
        },

        'clearMessages': function () {
            $("#messEdit_2").empty();
        },

        'clearSubscriptions': function () {
            $("#innerEdit_2").empty();
        }
    }
};

/*
####################################################################
[ny]A js file that gathers functions defined for consumer and websocket communication.
*socket.onopen()
*socket.onmessage()
*socket.onclose()
####################################################################
*/
let socket = new WebSocket('ws://127.0.0.1:8000/ws/game/' + room_number+ '/' + username + '/' + teamid);


/*[ny]Onopen event function called out when websocket connects*/
socket.onopen = function (e) {

    var data = {                        //[ny]Datas that will be delivered to consumer
        'username': username,
        'command': 'connect',
        'emotions': emotion_order,
    }
    socket.send(JSON.stringify({        //[ny]Transfer data to consumer in json format.
        data
    }));

}


/*[ny]Onmessage event function called out when it gets msg from consumer*/ 
socket.onmessage = function (e) {
    const data = JSON.parse(e.data);    //[ny]json.parse the gotten data
    console.log("%c[channels.js] socket.onmessage:",'color: green; font-size:15px;');
    console.log("%cCOMMAND: ",'color: blue;', data.payload.command);
    console.log("%cDATA: ",'color: blue;', data);

    
    if(data.payload.command == 'connect'){ 
        profile_in(data.payload.username);                  //[ny]show up the profile of entered user
        emotion_order = data.payload.emotions;              //[ny]emotion order of each round
        current_emotion = emotion_order[current_round-1];   //[ny]current emotion
    }
    else if(data.payload.command == 'disconnect'){ 
        profile_out(data.payload.username);                 //[ny]Delete exited user's profile.
        console.log("*disconnect result: ", "(out user) ", data.payload.username);
        if(gamestart == true){
            alert("[ny]Another player's connection status is unstable, forcing it to shut down.");
            window.location.href = '/game/channels/' + '?username=' + username;
        }

    }
    else if(data.payload.command == 'userlist'){

        if(lobby_flag == false){
            memlist = data.payload.userlist;    //[ny]Bring userlist
            survivors = [...memlist];
            survivor_count = survivors.length;  //[ny]Update the number of survivors
            memlist[4] = '봇';
    
            setTimeout(function(){              //[ny]Switch the screen in 2 seconds //[ny]Inactivate button
                go_next_page('lobby','round_start');
                round();
            }, 2500);
            lobby_flag = true;
            console.log("*memlist result: ", "(memlist) ", memlist);
            console.log("*survivors result: ", "(survivors) ", survivors, ' (survivor_count) ', survivor_count);    
        }

    }
    else if(data.payload.command == 'round_init'){
        var sur_plus_bot = [...survivors];
        sur_plus_bot.push('봇');

        for(var i=0; i<survivor_count+1; i++){  //[ny]Initialization of images allocated to the bot and users.
            src = ['','','',''];
            ids = ['','','',''];
            for(var j=0; j<4; j++){
                tmp_src = '/static/images/sampling/'+data.payload.assigned_imagesets[i][j]+'.jpg';
                src[j] = tmp_src;
                tmp_ids = data.payload.assigned_imagesets[i][j];
                ids[j] = tmp_ids;
            }

            all_image_set[sur_plus_bot[i]] = src;
            all_imageid_set[sur_plus_bot[i]] = ids;
            if(sur_plus_bot[i] == username){
                my_images = src;
            }
        }

        bot_prediction = data.payload.bot_prediction;
        init_bot_labels();      //[ny]Lable of the bot.

        console.log("*round_init result: ", "(all_image_set) ",  all_image_set);
        console.log("*round_init result: ", "(bot_labeling_set) ",  all_labeling_set['봇']);
        console.log("*round_init result: ", "(bot_define_last_mention call) ");

        bot_define_last_mention();

    }
    else if(data.payload.command == 'btn_ready'){
        change_to_ready(data.payload.username);     //[ny]Activate the profile of user who pressed ready button.
        console.log("*btn_ready result: ", "(ready user) ", data.payload.username);


    }
    else if(data.payload.command == 'btn_notready'){
        change_to_notready(data.payload.username);  //[ny]Inactivate the profile of user who pressed notready button.
        console.log("*btn_notready result: ", "(notready user) ", data.payload.username);


    }
    else if(data.payload.command == 'btn_labeling'){
        profile_wait(data.payload.username);
        console.log("*btn_labeling result: ", "(wait user) ", data.payload.username);

    }
    else if(data.payload.command == 'selection'){
        init_labels(data.payload.username, data.payload.labeling_set);  //[ny]Initialize who and how they labeled.
        console.log("*selection result: ", "(I am) ", data.payload.username,"(My labeling) ", data.payload.labeling_set);
        console.log("*selection result: ", "(merged all_labeling_set) ", all_labeling_set);

    }
    else if (data.payload.command == 'arrange_anonymous_order') {
        anonymous_user = data.payload.listdata;
        select_order = data.payload.select_order;
        console.log("*arrange_anonymous_order result: ", "(shuffled anonymous_user) ", anonymous_user);
        console.log("*select_order: ", "(shuffled select_order)", select_order);
    }
    else if (data.payload.command == 'point') {
        pointed_info['selector'] = data.payload.selector;
        pointed_info['target_num'] = data.payload.target_num;
        pointed_info['pointed_img_idx'] = data.payload.pointed_img_idx;
        current_chosen = anonymous_user[pointed_info['target_num']];
        console.log("*point result: ", "(pointed_info) [ny]Pointer: ",pointed_info['selector']);
        console.log(current_chosen, "of [ny] ", pointed_info['pointed_img_idx'], " [ny] is pointed out as suspicions.");
        
        set_postposition(pointed_info['target_num']);
        elect(pointed_info['selector'], current_chosen);
        console.log("*point result: ", "(elect function call) param 누가 누구를 [ah]이게 뭐지??");


    }
    else if (data.payload.command == 'pass') {
        pass_count++;
        pointed_info['selector'] = data.payload.selector;
        pass_flag[pointed_info['selector']] = 'true';

        console.log("*pass result: ", "(pass user) ", pointed_info['selector']);
        console.log("now pass count: ", pass_count);
        console.log("now pass flag: ", pass_flag);
        point_pass();
        console.log("*pass result: ", "(point_pass function call) ");

    }
    else if (data.payload.command == 'elect_result') {
        elect_result['thumb_up'] += data.payload.thumb_up;
        elect_result['thumb_down'] += data.payload.thumb_down;

        
        var elect_num = elect_result['thumb_up'] + elect_result['thumb_down'];
        if (elect_num == survivor_count-1 && current_chosen == '봇') {      // [ny]when bot is pointed out
            elect_result['thumb_down'] += 1;    // [ny]vote of pointer.
            console.log("*elect_result: 봇이 지목당해서, ", "(살리자): ", elect_result['thumb_up'],"(죽이자): ",'color: blue;',elect_result['thumb_down']);
            show_elect_result(current_chosen);
        }
        else if (elect_num == survivor_count-2 && current_chosen!='봇') {   // [ny]when bot isn't pointed out
            elect_result['thumb_down'] += 2;    // [ny]vote of pointer.
            console.log("*elect_result: 사람이 지목당해서, ", "(살리자): ", elect_result['thumb_up'],"(죽이자): ",elect_result['thumb_down']);
            show_elect_result(current_chosen);
        }
        console.log("*elect_result: ", "show_elect_result function call");

    }
    else if (data.payload.command == 'last_mention') {
        if(current_chosen == username){
            document.getElementById('game_body').classList.remove("turn_red");
            document.getElementById('find_bot').classList.remove("turn_red");
        }

        if (data.payload.no_response == true) {
            vacate_find_bot_content();
            notice("Anony " + pointed_info['target_num'] + "<span style='color:rgb(248, 41, 41);'> gave up on</span> their defense.", 'find_bot', '14px');
            
            setTimeout(()=>{
                no_mention(current_chosen);
            }, 3000);
            console.log("*last_mention_result: ", "[ny](No response of defense): The dead person is ", current_chosen);
            layout3('vacate');
        } else {
            last_mention(current_chosen, data.payload.last_mention_idx);
            console.log("*last_mention_result: ", "[ny](Submit defense): The submitter is ", current_chosen, ", [ny]The idx of submitted img is",data.payload.last_mention_idx);
            console.log("*last_mention_result: ", "(last_mention function call)");

        }
    }
    else if(data.payload.command == 'history'){
        hint = data.payload.hint;
        console.log("this is hint : ", hint);
    }

}
    

/*[ny]onclose event function called out when websocket unconnected */ 
socket.onclose = function (e) {
    alert("[ny]Unconnected. Try again please");
    console.log(username, " 's websocket disconnect");
}
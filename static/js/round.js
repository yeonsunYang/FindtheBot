/*
####################################################################
[ny]A js file with the functions responsible for progressing each round of the game.

*round_init()
*init ()
*sync_userlist()
*sync_selection()
*init_labels()
*init_bot_labels()
*designate_user_idx()
*arrayRemove()
*ready_btn_handler()
*round()
*labeling() ... update_labeling()
*


####################################################################
*/

document.addEventListener("DOMContentLoaded", function () {
    console.log("[ny]loaded")
});

var memlist = [];               // [ny]4 players existed in the game when it starts.
var survivors = [];             // [ny]A variable stored current survival players.
var select_order = [];          // [ny]A variable stored random order of bot nomination.
var all_image_set = {};         // [ny]A variable stored img set allocated to all players.
var all_imageid_set = {};
var all_labeling_set = {};      // [ny]A variable stored labeling set picked by all players at first time.
var my_labeling = [0,0,0,0];    // [ny]My labeling
var my_images = [];             // [ny]My img
var survivor_count = 0;         // [ny]the number of survivors
var wait_queue = [];            // [ny]A variable stored waiting players after lableing

var anonymous_user = {};        // [ny]Anonymous users order 

var current_round = 1;          // [ny]current round number
var current_selector = '';      // [ny]current picking person(used at find_bot)
var current_selector_idx = 0;   // [ny]the index of current picking person at select_order.
var current_chosen = '';        // [ny]current picked person

var current_emotion = 'what is the target emotion in this round?';
var emotion_order = [];         // [ny]Emotion order of each round
var emotion_name = { "0": "Neutral", "1": "Happy", "2": "Sad", "3": "Surprise", "4": "Fear", "5": "Disgust", "6": "Anger", "7": "Contempt" };
var emoji_src = { "0": "neutral.png", "1": "happy.png", "2": "sad.png", "3": "surprise.png", "4": "fear.png", "5": "disgust.png", "6": "angry.png", "7": "contempt.png" };//이모지 로고
var emotion_instruction = {"0": "Showing no emotion or mood", "1": "feelings of joy, contentment, or excitement","2": "feelings of sorrow, unhappiness or distress","3": "a sudden emotional state to an unexpected event",
"4": "an emotional state to a perceived threat or danger","5": "an emotional state of revulsion or strong disapproval","6": "an emotional state of displeasure or hostility","7": "feelings of disdain or lack of respect for someone"};
var bot_prediction = [];        // [ny]list with prediction of bot
var priorities = {};            // [ny]img order that bot will submit when last defense

var bot_death = false;          // [ny]Global Variables to Determine bot Death
var money_table = [16, 8, 4, 2];// [ny]acquired money of each round
var pass_flag = {};

var pointed_info = {
    'selector': '',
    'target_num': 123,
    'pointed_img_idx': 0123,
};
var pass_count = 0;
var lobby_flag = false;
var gamestart = false;
var hint = [];

/*[ds] round_init function : Initialize and Randomize all variables needed to progress each round */
function round_init() {
    /*
    -Allocate img to all randomly up to their level
    -predict by bot with it
    -Intialize flag_pointed
    */

    if (memlist[0] == username) {
        var data = {
            'username': username,
            'survivor_cnt': survivor_count,
            'cur_emotion' : current_emotion,
            'command': 'round_init',
        }
        socket.send(JSON.stringify({
            data
        }));
    }

    for(var i=0; i<survivors.length; i++){  // [ny]Reset pass_flag. 
        pass_flag[survivors[i]] = 'false';
    }

}

/* [ds]init function :  Initialize the information needed before the game starts - Shuffle feelings corresponding to round 4*/
function init(){
    let emotions = range(0,8);
    shuffle(emotions);
    emotion_order = emotions.slice(0,4);
}

/*[ds] sync_userlist function : Ask socket to bring userlist from db asynchronously. */
function sync_userlist() {
    var data = {                //[ny]Data that will be delivered to consumer
        'username': username,
        'command': 'userlist'
    }
    socket.send(JSON.stringify({//[ny]Send data in json format to consumer.
        data
    }));
}

/*[ds] sync_selection function : Inform {who(username), what labeling(labeling_set)} to socket. */
function sync_selection() {
    var data = {
        'username': username,
        'command': 'selection',
        'labeling_set': my_labeling,
    }
    socket.send(JSON.stringify({
        data
    }));
}

/* [ds]init_labels function :  {username, labeling_set} information received from the socket is put into the global variable and initialize what labeling all users have performed.*/
function init_labels(someone, labeling_set){
    for(var i=0; i<4; i++){
        if(survivors[i] == someone){        // survivor
            all_labeling_set[someone] = labeling_set;
            break;
        }
    }
}

/*[ds]init_bot_labels function : Determine whether the labeling value is 0 ir 1 with the prediction value turned over by the bot */
function init_bot_labels() {
    let cur_emo_idx = parseInt(current_emotion);
    console.log("this is emotion label: ");
    console.log(cur_emo_idx);
    tmp = [0, 0, 0, 0];

    console.log("this is bot_prediction: ");
    console.log(bot_prediction);

    for (var j = 0; j < 4; j++) {
        if (bot_prediction[j][cur_emo_idx] > 0.4) { //예측값이 0.4 이상이면 참.
            tmp[j] = 1;
        }
    }
    all_labeling_set['봇'] = [...tmp];
    console.log("this is all_labeling_set:");
    console.log(all_labeling_set['봇']);
}


/*[ds] arrayRemove function : Eleminate the arryvalues(nothing in js) */
function arrayRemove(arr, value) {
    return arr.filter((e) => {
        return e != value;
    });
}

/*[ds] ready_btn_handler function : The function responsible for the event when the Ready button/Notready button is pressed. */
function ready_btn_handler() {
    ready_btn = document.getElementById('ready_btn');
    var idx = 0;

    ready_btn.onclick = function () {
        if (ready_btn.textContent == "READY") {     // [ny](1)If ready button is pressed,
            layout2('wait_ready');
            ready_btn.classList.remove('blink');    // [ny]Remove the blink effect 
            ready_btn.textContent = "UNREADY";
            ready_btn.style.backgroundColor = '#D8D8D8';
            for (var i=0; i<4; i++){
                if (profiles_name[i].innerText == username) {
                    idx = i;
                    profiles[i].style.backgroundColor = "#EBC604";
                    break;
                }
            }

            /*[ny]Inform that ready button is pressed to socket*/
            var data = {
                'username': username,
                'command': 'btn_ready'
            }
            socket.send(JSON.stringify({
                data
            }));
        }
        else {                                      // [ny](2) If the notready button is preessed,
            layout2('click_ready');
            ready_btn.classList.add('blink');       // [ny]Add blink effect
            ready_btn.textContent = "READY";
            ready_btn.style.backgroundColor = '#EBC604';

            profiles[idx].style.backgroundColor = "#dddddd";

            /*[ny]Inform that notready button is pressed to socket*/
            var data = {
                'username': username,
                'command': 'btn_notready'
            }
            socket.send(JSON.stringify({
                data
            }));
        }
    };
}

/*[ds] Main function : Write the whole logic of round progress */
function round() {
    switch ('block') {
        case document.getElementById('lobby').style.display:
            //[ny]being Activated sync_userlist() when someone enters .
            init();         // [ny]Randomize emotion for each round. 
            init_profile(); // [ny]Show up the profile of users entering the channel.
            layout1('click_ready', 'lobby');
            layout2('click_ready');
            ready_btn_handler(); // [ny]Implement the act of ready/notready button.
            break;

        case document.getElementById('round_start').style.display:
            round_init(); // [ny]Being allocated imgs, bot prediction. 
            gamestart = true;
            var emotion_names = document.querySelectorAll('.emotion_name'); 
            full_emoji_src = '/static/images/' + emoji_src[current_emotion];
            document.getElementById('large_emotion').src = full_emoji_src;      // [ny]Show up the img logo.
            emotion_names.forEach((each_emotion_area) => { each_emotion_area.innerText = emotion_name[current_emotion]; });
            document.getElementById('emotion_instruction').innerText = emotion_instruction[current_emotion];

            if(current_round == 4){
                document.getElementById('rn').innerText = "[ny]final";
            }
            else{
                document.getElementById('rn').innerText = current_round;
            }
            
            setTimeout(() => {
                go_next_page('round_start', 'labeling'); // [ny]Labeling after 5s.
                round();
            }, 5000);
            break;

        case document.getElementById('labeling').style.display:
            document.getElementById('emotion_name').innerText = emotion_name[current_emotion];
            layout1('round_title', 'labeling');
            layout2('timer');   // [ny]Timer starts.
            labeling();         // [ny]Implement labeling.
            break;

        case document.getElementById('waiting').style.display:  
            document.querySelectorAll('.waiting_box').forEach((each_box) => {
                each_box.style.backgroundColor = '#dddddd';
            });

            layout1('round_title', 'waiting');  
            layout2('wait_labeling');
            init_wait(); // [ny]Activate the waiting user after completing labeling.
            break;

        case document.getElementById('after_selection').style.display:
            if(dropouts.includes(username)){
                document.getElementById('game_body').classList.remove('turn_grey');
            }
            document.getElementById('game_body').classList.add("turn_black");
            sync_selection();               // [ny]Synchronize users' labeling through socket.

            console.log("these are all labelings!");
            console.log(all_labeling_set);  // [ny]Take a test if all predictions are arrived well or not. 

            setTimeout(() => {
                go_next_page('after_selection', 'glance'); //Convert to glance page after 3s.
                round();
            }, 3500);
            break;

        case document.getElementById('glance').style.display:
            document.getElementById('game_body').classList.remove("turn_black");
            if(dropouts.includes(username)){
                document.getElementById('game_body').classList.add('turn_grey');
            }
            anonymous_order();  // [ny]Set the anonymous order.
            layout1('round_title', 'glance');
            glance();
            break;

        case document.getElementById('find_bot').style.display:

            console.log("start finding bot");
            document.getElementById('mini_user_level').innerHTML = 'Lv. ' + user_level;
            var chip_area = document.getElementById('mini_user_chip')
            chip_area.innerHTML = '<img src="/static/images/chip.png" style="height:20px;">';
            if (user_money >50 && user_money<= 100) {
                console.log(user_money);
                chip_area.innerHTML += '<img src="/static/images/chips.png" style="height:20px;">';
            } else if (user_money > 100) {
                console.log(user_money);
                chip_area.innerHTML += '<img src="/static/images/chips.png" style="height:20px;"><img src="/static/images/chips.png" style="height:20px;">';
            }

            if(username == memlist[0]){ // [ny]labeling set, image set info deliver to update db
                gameusers = [...survivors];
                gameusers.push('봇');

                var data = {
                    'username': username,
                    'command': 'updateDB_labeling',
                    'all_labeling_set': all_labeling_set,
                    'all_imageid_set': all_imageid_set,
                    'teamid': teamid,
                    'gameusers' : gameusers
                }
                socket.send(JSON.stringify({
                    data
                }));
            }
            
            layout1('round_title', 'find_bot');
            notice(current_round + '[ny]round starts.<br>there are ' + survivor_count + 'current survivor(s).', 'find_bot', 'small');
            current_selector = select_order[current_selector_idx];
            point_out_bot(current_selector);
            break;
    }
}

round();


/* [ds]show function : Show 4 imgs up */
function show(name, choice, page_name) {
    var color = [];
    for (var i=0; i<4; i++) {
      if (choice[i]==0) {
        color[i] = '#F81E1E';
      } else if(choice[i]==1) {
        color[i] = '#72DF4B';
      }
      else if(choice[i]==2){ //[ny]If this img is submitted as evidence before,
        color[i] = '#BBBBBB';
      }
    }
    
    document.getElementById(page_name+"_img_container").innerHTML ='\
    <span><div class="point_images" style="background-color:'+ color[0] + ';"><img class="img imgs" src="'+all_image_set[name][0]+'"></div></span>\
    <span><div class="point_images" style="background-color:'+ color[1] + ';"><img class="img imgs" src="'+all_image_set[name][1]+'"></div></span>\
    <br><br>\
    <span><div class="point_images" style="background-color:'+ color[2] + ';"><img class="img imgs" src="'+all_image_set[name][2]+'"></div></span>\
    <span><div class="point_images" style="background-color:'+ color[3] + ';"><img class="img imgs" src="'+all_image_set[name][3]+'"></div></span>';

    var imgs = document.querySelectorAll(".imgs");
    var idx = 0;
    imgs.forEach((pointed) => {
        if(choice[idx]==2){
            pointed.classList.add("grayscale");
        }
        console.log(pointed.classList);
        idx++;
    });
}


/*[ds]labeling function : Save as a boolean type depending on whether the image is selected or not */
function labeling() {
    if (dropouts.includes(username)){
        go_next_page('labeling', 'waiting');
        round();
        var data = {
            'username' : username,
            'command' : 'btn_labeling'
        }
        socket.send(JSON.stringify({
            data
        }));
        
    } else {        
        document.getElementById("labeling_img_container").innerHTML = '\
        <span><div class="label_images" id="image_1"><img class="img" src="'+my_images[0]+'" loading="lazy" onerror="img_error()"></div></span>\
        <span><div class="label_images" id="image_2"><img class="img" src="'+my_images[1]+'" loading="lazy" onerror="img_error()"></div></span>\
        <br><br>\
        <span><div class="label_images" id="image_3"><img class="img" src="'+my_images[2]+'" loading="lazy" onerror="img_error()"></div></span>\
        <span><div class="label_images" id="image_4"><img class="img" src="'+my_images[3]+'" loading="lazy" onerror="img_error()"></div></span>';
    
        timer_start(10);
        //[ny]Change color when img is clicked
        var done_flag = false; 
        image_btn = document.querySelectorAll('.label_images');
        image_btn.forEach((target) => target.addEventListener("click", () => {
            now_img_tag = target.querySelector('.img');
            now_img_id = now_img_tag.src.split('/').pop().split('.')[0];
            if (target.classList.contains("labeled")) {
                target.classList.remove("labeled");
            } else {
                target.classList.add("labeled");
            }
        }));
        
        // var update_label = setTimeout(update_labeling, 11000);
        var update_label = setTimeout(()=>{
            update_labeling();
        }, 11000);

        
        labeling_done_btn = document.querySelector('#labeling_done');
        labeling_done_btn.onclick = function() {
            clearTimeout(update_label);
            update_labeling();
            done_flag = true;
        }
        
    
        function update_labeling() {
            if (done_flag == false) {                   // [ny]prevent duplicated act of update_labeling() by labeling_done_btn and setTimeout.
                for (var i = 1; i < 5; i++) {
                    img = document.getElementById('image_' + i);
                    if (img.classList.contains("labeled")) {
                        my_labeling[i - 1] = 1;
                    }
                }
    
                /*[ny]Inform that labling is doen to socket*/    //[ny]If the complet button is pressed or after 10s,
                var data = {
                    'username' : username,
                    'command' : 'btn_labeling'
                }
                socket.send(JSON.stringify({
                    data
                }));
                console.log(my_labeling);
                go_next_page('labeling', 'waiting');
                round();
            }
        }   
    }
    console.log("[ny]My labeling() is safely done!!!");
}

/* [ds]shuffle function : shuffle the factors in list, used at anonymous_order */
function shuffle(a) {
    var j, x, i;
    for (i = a.length; i; i -= 1) {
        j = Math.floor(Math.random() * i);
        x = a[i - 1];
        a[i - 1] = a[j];
        a[j] = x;
    }
    return a;
}

/* [ds]range function : Make a list by increasing the number by 1 by count from start, used in anonymous_order  */
function range(start, count) {
    let array = [];
    while (count--) {
        array.push(start++);
    }
    return array;
}

/* [ds]anonymous_order function : Create a dictionary that specifies names corresponding to anonymous 1, 2, 3, and 4 to communicate with the socket. */
function anonymous_order() {
    var survivor_range = range(1, survivor_count + 1);
    shuffle(survivor_range);
    var survivor_plus_bot = [...survivors];
    survivor_plus_bot.push('봇');
    var i = 1;
    for (var anony_num of survivor_range) {
        anonymous_user[i++] = survivor_plus_bot[anony_num-1];                   // survivors
    }
    select_order = shuffle(arrayRemove(Object.values(anonymous_user), '봇'));   // [ny]shuffle select order again
    var data = {
        'command': 'arrange_anonymous_order',
        'select_order': select_order,
        'listdata': anonymous_user,
    }
    socket.send(JSON.stringify({
        data
    }));
}

/*[ds] glance_content(order)function : Show the labeling results on HTML */
function glance_content(order) {
    var bottom_area = document.getElementById('glance_bottom');
    var real_order = order + 1;
    var name = anonymous_user[real_order];
    set_postposition(real_order);
    console.log("(###glance###) real_order=" , real_order);
    console.log("(###glance###) name=" , name);

    if (name == username) {
        notice('I\'am anonymous ' + real_order, 'glance', '20px');
        document.getElementById('glance').classList.add('turn_yellow');
        document.getElementById('game_body').classList.add('turn_yellow');
        bottom_area.innerHTML = "This is my labeling."; 

    } else {
        notice("Annonymous " + real_order, 'glance', '20px');
        bottom_area.innerHTML ='<div><span style="color: #07B04B;">■</span> : Selected as ' +emotion_name[current_emotion]+ '<br>\
        <span style="color: red;">■</span> : Deselected as ' +emotion_name[current_emotion]+'\</div>';

        document.getElementById('glance').classList.remove('turn_yellow');
        document.getElementById('game_body').classList.remove('turn_yellow');
    }

    var color = [];
    var select_info = [];
    for (var j = 0; j < 4; j++) {
        if (all_labeling_set[name][j] == 0) {
            color[j] = '#F81E1E';
            select_info[j] = '<span style="color:' + color[j] + ';">Non-selected</span>';
        } else {
            color[j] = '#72DF4B';
            select_info[j] = '<span style="color:' + color[j] + ';">Selected</span>';
        }
    }

    document.getElementById("glance_content").innerHTML = '<div style="padding: 20px;">\
        <span><div class="glance_images" style="background-color:'+ color[0] + ';"><img class="img" src="' + all_image_set[name][0] + '" loading="lazy" onerror="img_error()"><p>' + select_info[0] + '</p></div></span>\
        <span><div class="glance_images" style="background-color:'+ color[1] + ';"><img class="img" src="' + all_image_set[name][1] + '" loading="lazy" onerror="img_error()"><p>' + select_info[1] + '</p></div></span>\
        <br><br>\
        <span><div class="glance_images" style="background-color:'+ color[2] + ';"><img class="img" src="' + all_image_set[name][2] + '" loading="lazy" onerror="img_error()"><p>' + select_info[2] + '</p></div></span>\
        <span><div class="glance_images" style="background-color:'+ color[3] + ';"><img class="img" src="' + all_image_set[name][3] + '" loading="lazy" onerror="img_error()"><p>' + select_info[3] + '</p></div></span>\
    </div>';

}

/*[ds] glance function : Invoke glance_content with time spaces*/
function glance() {
    document.getElementById('glance_top').innerHTML = "";
    document.getElementById('glance_content').innerHTML = '<br><br><br><br><br><div class="loading"><div></div></div>';
    var order = 0;
    
    var glance_interval = setInterval(function () {
        if (order == survivor_count + 1) {
            clearInterval(glance_interval);
            document.getElementById('glance').classList.remove('turn_yellow');
            document.getElementById('game_body').classList.remove('turn_yellow');
            go_next_page('glance', 'find_bot');
            round();
        } else {
            document.getElementById('glance_content').innerHTML = "";
            glance_content(order);
            order++;
        }
    }, 3700);
}

/* [ds]set_anonymous_btn function : Show the anonymous botton except itself on ind_bot page */
function set_anonymous_btn() {
    for (var i of Object.keys(anonymous_user)) {
        if (anonymous_user[i] == username) {
            document.getElementById('anonymous_btns').innerHTML += '<button class="anonymous" id="anonymous_' + i + '" type="button">Me</button>'
        }
        else if(dropouts.includes(anonymous_user[i])){      // [ny]It who is observers,
            document.getElementById('anonymous_btns').innerHTML += '<button class="anonymous" id="anonymous_' + i + '" type="button">Out</button>'
            document.getElementById('anonymous_'+i).disabled = true;

        } 
        else {
            document.getElementById('anonymous_btns').innerHTML += '<button class="anonymous" id="anonymous_' + i + '" type="button">Anony' + i + '</button>'
        }
    }
}

var i_ga = '';
var eun_neun = '';
var eul_leul = '';
/*[ds] set_postposition function: a function that anonymously specifies thatletter  [ah]나중에 지우기*/
function set_postposition(target_number) {
    if (target_number == 1 || target_number == 3) {
        i_ga = '이';
        eun_neun = '은';
        eul_leul = '을';
    } else {
        i_ga = '가';
        eun_neun = '는';
        eul_leul = '를';
    }
}

/*[ds] game_end function: Check if the game is done or not */
function game_end() {
    //    win if you find the bot
    //    lose if there are only 2 people
    //    lose(current_round == 5) if you are in round 5
    //    continue in rest of cases
    if(bot_death == true){          // [ny]Win
        if (memlist[0] == username) {

            gameusers = [...survivors];
            gameusers.push('봇');

            var data = {
                'username': username,
                'gameusers' : gameusers,
                'command': 'updateDB_roundstop',
            }
            socket.send(JSON.stringify({
                data
            }));
        
        }
        return 'win';
    }
    else if(survivor_count == 2){   // [ny]defeat
        if (memlist[0] == username) {

            gameusers = [...survivors];
            gameusers.push('봇');

            var data = {
                'username': username,
                'gameusers' : gameusers,
                'command': 'updateDB_roundstop',
            }
            socket.send(JSON.stringify({
                data
            }));
        
        }

        return 'lose';
    }
    else if(current_round == 5){    // [ny]defeat

        if (memlist[0] == username) {

            gameusers = [...survivors];
            gameusers.push('봇');

            var data = {
                'username': username,
                'survivor_cnt': survivor_count,
                'gameusers' : gameusers,
                'command': 'updateDB_roundend',
            }
            socket.send(JSON.stringify({
                data
            }));
        
        }

        return 'lose';
    }
    else{
        return 'continue';
    }
}


/* [ds]button_pointing_or_pass function: Send the evidence which is pointed out to socket */
function button_pointing_or_pass() {
    var pointed_img_set = [];
    set_anonymous_btn();
    timer_start2('find_bot_timer', 15);
    var anonymous_btn = document.querySelectorAll('.anonymous');
    var target_num = 'who?';
    var anonymous_keys = Object.keys(anonymous_user);
    var my_anony_idx = anonymous_keys.find((key)=>anonymous_user[key]==username);
    document.getElementById('anonymous_'+my_anony_idx).disabled = true;

    
    anonymous_btn.forEach((target) => target.addEventListener("click", () => {  // [ny]If the anonymous button is clicked
        anonymous_btn.forEach((each_btn) => {
            each_btn.classList.remove("clicked");           // [ny]Add the class named clicked -> Set on css
        });
        target.classList.add("clicked");

        target_num = target.id.charAt(target.id.length - 1); //[ny]one of anonymous 1,2,3,4,5
        idxNum = parseInt(target_num);
        var target_name = anonymous_user[target_num];
        var target_choice = all_labeling_set[target_name];

        show(target_name, target_choice, 'find_bot');

        //[ny]Add class named clicked in selected img 
        pointed_img_set = document.querySelectorAll('.point_images');

        var idx=0;
        pointed_img_set.forEach((pointed)=>{ //[ny]Can't pick the img submitted as evidence before.
            if(target_choice[idx]==2){
                pointed.classList.add("nonepoint");
            }
            idx++;
        });

        pointed_img_set.forEach((target) => target.addEventListener("click", () => {
            pointed_img_set.forEach((each_btn) => {
                each_btn.classList.remove("pointed");
            });
            target.classList.add("pointed");

            now_img_tag = target.querySelector('.img');
            now_img_id = now_img_tag.src.split('/').pop().split('.')[0];
        }));


    }));

    document.getElementById('point_pass_yes_no_area').innerHTML = '\
    <button type="button" class="point_pass_yes_no" id="point_done">Spot</button>\
    <button type="button" class="point_pass_yes_no" id="pass">Pass</button>';


    var pointed_img_idx;    // [ny]0,1,2,3 중 하나
    document.getElementById('point_done').addEventListener("click", () => { //[ny] when done button is pressed
        var point_flag = false;
        try {
            for (var i = 0; i < 4; i++) {
                if (!pointed_img_set[i].classList.contains("pointed")) {
                    continue;
                } else {
                    pointed_img_idx = i;
                    point_flag = true;
                    break;
                }
            }

            if(point_flag == true){
                document.getElementById('point_done').style.backgroundColor = "#EBC604";
                clearTimeout(go_elect);
                document.getElementById('point_done').disabled = true;
                document.getElementById('pass').disabled = true;
                var data = {
                    'selector': username,
                    'target_num': target_num,
                    'pointed_img_idx': pointed_img_idx,
                    'command': 'point',
                };
                socket.send(JSON.stringify({
                    data
                }));
            }

        } catch {
            console.log("[ny]Must check after pointing out!!")
        }
    });

    document.getElementById('pass').addEventListener("click", () => { // [ny]When the pass button is pressed
        document.getElementById('pass').style.backgroundColor = "#EBC604";
        clearTimeout(go_elect);
        document.getElementById('pass').disabled = true;
        document.getElementById('point_done').disabled = true;
        var data = {
            'selector': username,
            'pass_count': pass_count,
            'command': 'pass',
        };
        socket.send(JSON.stringify({
            data
        }));
    });

    var go_elect = setTimeout(() => {
        document.getElementById('point_done').disabled = true;
        document.getElementById('pass').click();
    }, 16000);

    //[ny]Move to elect window after 15s
}

/* [ds]next_point_out_bot function: A function that turns over so that the next anonymous user can point to a bot */
function next_point_out_bot() {
    current_selector_idx = (current_selector_idx+1)%survivor_count;
    current_selector = select_order[current_selector_idx];
    console.log("next point out bot!!!!!!!");
    while(true){
        if(pass_flag[current_selector] != 'false'){
            current_selector_idx = (current_selector_idx+1)%survivor_count;
            current_selector = select_order[current_selector_idx];
        }
        else{
            break;
        }
        if(pass_count >= survivor_count){
            break;
        }
    }

    vacate_find_bot_content();
    elect_result['thumb_up'] = 0;
    elect_result['thumb_down'] = 0;

    var res = game_end();
    var get_money = 0;
    var get_exp = 200;
    var flag_die = false;
    var lose_reason = 'die';        // [ny]exceed OR die
    var now_round = current_round;
    /*[ny]Inspect game over*/
    if (res == 'win') {
        gamestart = false;
        get_money = money_table[current_round - 1];
        if (dropouts.includes(username)) {
            get_money /= 2;         // [ny]Observer acquires the half rewards.
            flag_die = true;
        }

        window.location.href = '/game/ending/' + '?username=' + username + "&result=" + res + "&money=" + get_money + "&exp=" + get_exp +"&flag=" + flag_die + "&rsn=" + lose_reason + "&rnd=" + now_round;
    }
    else if (res == 'lose') {
        gamestart = false;

        window.location.href = '/game/ending/' + '?username=' + username + "&result=" + res + "&money=" + get_money + "&exp=" + get_exp +"&flag=" + flag_die + "&rsn=" + lose_reason + "&rnd=" + now_round;
    }
    else {
        point_out_bot(current_selector);
    }
}

/* [ds]vacate_find_bot_content function: Empty content out in find_bot page */
function vacate_find_bot_content() {
    document.getElementById('anonymous_btns').innerHTML = "";
    document.getElementById('find_bot_img_container').innerHTML = "";
    document.getElementById('find_bot_timer').innerHTML = "";
    document.getElementById('point_pass_yes_no_area').innerHTML = "";
    document.getElementById('glance_bottom').innerHTML = "";

}



/* [ds]elect function: Send the reseult of voting to socket */
function elect(current_selector, current_chosen) {
    // [ny]Show the anonymous button
    vacate_find_bot_content();
    set_anonymous_btn();
    if (current_chosen != username) {
        document.getElementById('anonymous_' + pointed_info['target_num']).style.backgroundColor = 'rgb(235, 198, 4)';
    }
    // pass_count++; //[ny]vote is not a pass.

    // [ny]functon showing the evidence
    function show_evidence(towhom) {
        if (towhom == current_chosen) {
            document.getElementById('find_bot_img_container').innerHTML = "\
            <br><br>Evidence<br><div class='point_images' style='margin-top: 5px;'>\
            <img src='/static/images/question_mark.png' style='width:100px;'><br></div>"; 

        } else {
            var color = 'yellow';
            var ox = '';
            if (all_labeling_set[current_chosen][pointed_info['pointed_img_idx']] == 0) {
                color = 'red';
                ox = 'Non-selected';
            } else {
                color = 'green';
                ox='Selected';
            }
            document.getElementById('find_bot_img_container').innerHTML = "\
            <br><br>Evidence<br><div class='point_images' style='margin-top: 5px; background-color: "+color+";'>\
            <img src='"+all_image_set[current_chosen][pointed_info['pointed_img_idx']]+"' style='width: 100px;'></div><br><p style='color:"+color+";'>"+ ox +"</p>";
        }
    }
    layout3('pointed');
    if (current_chosen == username) {           // [ny]I'm pointed out
        document.getElementById('game_body').classList.add("warnings");
        document.getElementById('find_bot').classList.add("warnings");
        show_evidence(current_chosen);
        setTimeout(() => {
            notice('Voting', 'find_bot', '20px');
            layout3('wait_elect');
        }, 2000);
    }
    else if (current_selector == username) {    // [ny]If I am a picker

        show_evidence(current_selector);

        setTimeout(() => {
            notice('Voting', 'find_bot', '20px');
            layout3('wait_elect');
        }, 2000);
    }
    else if (dropouts.includes(username)) {     // [ny]Observer mode
        monitor();
        show_evidence(current_selector);

        setTimeout(() => {
            notice('Voting', 'find_bot', '20px');
            layout3('wait_elect');            
        }, 2000);
    }
    else {                                      // [ny]I am not pointed out
        show_evidence("I'll vote");

        setTimeout(() => {
            var is_thumb_up = 0;
            var is_thumb_down = 0;
            notice('Voting', 'find_bot', '20px');
            layout3('elect');
            timer_start2('find_bot_timer', 5);
            document.getElementById('point_pass_yes_no_area').innerHTML = '\
            <button type="button" class="point_pass_yes_no" id="thumb_up"><img src="/static/images/profile.png" style="width:35px;"></button>\
            <button type="button" class="point_pass_yes_no voted" id="thumb_down"><img src="/static/images/bot.png" style="width:36px;"></button>';
            //[ny]thumbs down is voted as default.

            var thumbs = document.querySelectorAll('.point_pass_yes_no');
            var btn_name = "";

            thumbs.forEach((target) => target.addEventListener("click", () => {
                thumbs.forEach((each_btn) => {
                    each_btn.classList.remove("voted");
                });
                target.classList.add("voted");
                if(target.id == "thumb_up"){
                    btn_name = "manbtn";
                }
                else{
                    btn_name = "botbtn";
                }
            }));

            setTimeout(() => {
                if (document.getElementById('thumb_up').classList.contains("voted")) {
                    is_thumb_up = 1;
                }
                else if (document.getElementById('thumb_down').classList.contains("voted")) {
                    is_thumb_down = 1;
                }

                var data = {
                    'thumb_up': is_thumb_up,
                    'thumb_down': is_thumb_down,
                    'command': 'elect_result',
                };
                socket.send(JSON.stringify({
                    data
                }));
            }, 6000);
        }, 2000);
    }

}

var elect_result = {
    'thumb_up': 0,
    'thumb_down': 0,    // [ny]bot should vote 
};

/*[ds] show_elect_result function: Show the result of voting */
function show_elect_result(current_chosen) {
    document.getElementById('find_bot_timer').innerHTML = "";
    document.getElementById('point_pass_yes_no_area').innerHTML = "";
    layout3('vacate');
    var thumb_backcolor = ['#dddddd', '#dddddd'];
    if(current_chosen == username){
        document.getElementById('game_body').classList.remove("warnings");
        document.getElementById('find_bot').classList.remove("warnings");
    }
    var elect_death_flag = false;
    var elect_word = 'maybe bot';

    if(elect_result['thumb_down'] > elect_result['thumb_up']){
        elect_death_flag = true;
        elect_word = 'maybe bot';
    }
    else{
        elect_death_flag = false;
        elect_word = 'maybe man';
    }

    if (elect_death_flag == true) { //[ny]reseults of vote : let's kill,
        thumb_backcolor[1] = '#EBC604';
        document.getElementById('find_bot_img_container').innerHTML += '<p style="font-size:12px;">A majority suspects <b style="color:#EBC604;">it\'s a bot.</p>';
        
        setTimeout(() => {
            ready_last_mention(current_chosen);
        }, 2000);
    } else {
        thumb_backcolor[0] = '#EBC604';
        document.getElementById('find_bot_img_container').innerHTML += '<p style="font-size:12px;">Avoided suspicion.</p>';
        setTimeout(() => {
            all_labeling_set[current_chosen][pointed_info['pointed_img_idx']] = 2; //[ny]Change the submitted evidence parameter as 2.
            next_point_out_bot();
        }, 2000);
    }

    if (memlist[0] == username) {
        var data = {
            'username': username,
            'survivor_cnt': survivor_count,
            'current_chosen_user' : current_chosen,
            'current_chosen_img' : all_imageid_set[current_chosen][pointed_info['pointed_img_idx']],
            'agreements' : elect_result['thumb_up'], 
            'command': 'updateDB_pointing',
        }
        socket.send(JSON.stringify({
            data
        }));
    
    }

    document.getElementById('find_bot_img_container').innerHTML += '\
    <div class="elect_result"><button type="button" class="point_pass_yes_no2" id="thumb_up" style="margin: 0px; background-color:'+ thumb_backcolor[0] + ';"><img src="/static/images/profile.png" style="width:35px;"></button><br>' + elect_result['thumb_up'] + '</div>&emsp;\
    <div class="elect_result"><button type="button" class="point_pass_yes_no2" id="thumb_down" style="margin: 0px; background-color:'+ thumb_backcolor[1] + ';"><img src="/static/images/bot.png" style="width:36px;"></button><br>' + elect_result['thumb_down'] + '</div>';


}

/*[ds] point_pass function: Activated when giving up to point out the bot */
function point_pass() {
    layout3('pass');

    document.getElementById('find_bot_img_container').innerHTML = '<br><br><br><br><br><br><span class="pass_span">PA</span><span class="pass_span">SS</span>';
    var line1 = document.getElementById('find_bot_img_container');
    var line1Spans = document.querySelectorAll('.pass_span');

    // [ny]pass Animation
    TweenMax.set([line1], {
        x: -15
    })
    TweenMax.set([line1Spans], {
        alpha: 0
    })

    var tl = new TimelineMax({
        repeat: 0
    });

    tl.add(
        TweenMax.to(line1, .75, {
            x: 0,
        }),
        "start"
    )
    tl.add(
        TweenMax.staggerTo(line1Spans, .5, {
            alpha: 1,
        }, .05),
        "start"
    )

    setTimeout(() => {
        next_point_out_bot();
    }, 2000);
}


/*[ds]bot_define_last_mention function : A function that sets the priority src to be submitted by the bot as evidence of the last defense */
function bot_define_last_mention() {
    /*
    #logic# (@@ 테스트 시 봇이 최후의 변론 너무 못하면 규칙 수정하자. )
    // (1) current_emotion 인데 레이블링 안했을 경우
    // (2) current_emotion 아닌데 레이블링 했을 경우
    */
    let cur_emo_idx = parseInt(current_emotion);
    abs = {};
    for (var i = 0; i < 4; i++) {   // [ny]|(Prediction of bot : -0.4)| is put in dictionary. 
        diff = Math.abs(bot_prediction[i][cur_emo_idx] - 0.4);
        abs[i] = diff;
    }

    /*dictionary abs sorting*/      //[ny]possibly there is wrong labeling if the difference of absolute value is small.
    priorities = Object.entries(abs).sort((a, b) => a[1] - b[1]);
    console.log("this is sorted dictionary!");
    console.log(priorities);
}

/*bot_last_mention function: guess the evidence of last defense by bot */
function bot_last_mention() {
    /*[ny]return from prior order.*/
    for (let element of priorities) {
        idx = element[0];   //[ny]img of nth
        if (all_labeling_set['봇'][idx] == 2) { //[ny]If it is already submitted as evidence,
            continue;
        }
        else {                                  //[ny]If it is not submitted as evidence,
            console.log("봇이 증거를 제출했습니다.");
            console.log(all_image_set['봇'][idx]);
            return idx;
        }
    }

}

/*[ds] ready_last_mention function: Before last defense, Set the evidence and img of last defense */
function ready_last_mention(current_chosen) {
    var color = 'yellow';
    var ox = '';
    if (all_labeling_set[current_chosen][pointed_info['pointed_img_idx']] == 0) {
        color = 'red';
        ox = 'Non-selected';
    } else {
        color = 'green';
        ox = 'Selected';
    }
    notice('Last defense', 'find_bot', '20px');

    document.getElementById('find_bot_img_container').innerHTML = "<br><br>\
            <div class='to_compare'>Evidence<br><div id='point_img_id' class='point_images' style='margin-top: 5px; background-color: "+ color + ";'>\
            <img id='last_mention_evidence' src='/static/images/question_mark.png' style='width:100px;'></div><br>\
            <p id='answer_corrent' style='color:"+color+";'>"+ ox + "</p></div><div id='survival_ment'></div>\
            <div class='to_compare'>Last defense<br><div id='evidence_img_id' class='point_images' style='margin-top: 5px;'>\
            <img id='last_mention_image' src='/static/images/question_mark.png' style='width:100px;'></div><p id='last_correct'>&nbsp;</p></div>";

    if (current_chosen == username) {
        document.getElementById('game_body').classList.add("turn_red");
        document.getElementById('find_bot').classList.add("turn_red");
        
        show(current_chosen, all_labeling_set[current_chosen], 'find_bot');
        pointed_img_set = document.querySelectorAll('.point_images');
        timer_start2('find_bot_timer', 6);
        layout3('ready_last_mention');
        var idx=0;
        pointed_img_set.forEach((pointed)=>{                //[ny]You can't choose  img if it is already submitted as evidence.
            if(all_labeling_set[current_chosen][idx]==2){
                pointed.classList.add("nonepoint");
            }
            idx++;
        });

        pointed_img_set.forEach((target) => target.addEventListener("click", () => {
            var cur_idx = 0;
            var n=0;
            pointed_img_set.forEach((each_btn) => {
                each_btn.classList.remove("last_pointed");
                if(each_btn == target){
                    cur_idx = n;
                }
                n++;
            });
            target.classList.add("last_pointed");

            now_img_tag = target.querySelector('.img');
            now_img_id = now_img_tag.src.split('/').pop().split('.')[0];
        }));

        setTimeout(() => {
            var last_mention_idx = 0;
            var no_response = false;
            var is = false;
            for (var i = 0; i < 4; i++) {
                if (!pointed_img_set[i].classList.contains("last_pointed")) {
                    continue;
                } else {
                    last_mention_idx = i;
                    is = true;
                }
            }

            if (is==false){
                no_response = true;
            }

            var data = {
                'last_mention_idx': last_mention_idx,
                'no_response' : no_response,
                'command': 'last_mention',
            };
            socket.send(JSON.stringify({
                data
            }));
        }, 6500);
    }
    else if(current_chosen == '봇' && memlist[0] == username){ //
        var last_mention_idx = bot_last_mention();

        var data = {
            'last_mention_idx': last_mention_idx,
            'command': 'last_mention',
        };

        setTimeout(()=>{
            socket.send(JSON.stringify({
                data
            }));
        }, 7000);   // [ny] Submit the defense by bot after 5s.
        layout3('wait_last_mention');
        document.getElementById('last_mention_evidence').src = all_image_set[current_chosen][pointed_info['pointed_img_idx']];  // [ny]evience src

    }
    else {
        layout3('wait_last_mention');
        document.getElementById('last_mention_evidence').src = all_image_set[current_chosen][pointed_info['pointed_img_idx']];  // [ny]evidence src
    }

}

/* [ds]last_mention function: Do Last defense */
function last_mention(current_chosen, last_mention_idx) {
    var who = "";
    var color = 'yellow';
    layout3("last_mention"); //[ny]Let's move on last defense!
    if (all_labeling_set[current_chosen][pointed_info['pointed_img_idx']] == 0) {
        color = 'red';
    } else {
        color = 'green';
    }
    if (current_chosen == username) {
        document.getElementById('find_bot_timer').innerHTML = "";
        document.getElementById('find_bot_img_container').innerHTML = "<br><br>\
        <div class='to_compare'>Evidence<br><div class='point_images' style='margin-top: 5px; background-color: "+ color + ";'>\
        <img id='last_mention_evidence' src='/static/images/question_mark.png' style='width:100px;'></div></div>\
        <div id='survival_ment'></div>\
        <div class='to_compare'>Last defense<br><div id='evidence_img_id' class='point_images' style='margin-top: 5px;'>\
        <img id='last_mention_image' src='"+ all_image_set[current_chosen][last_mention_idx] + "' style='width:100px;'></div></div>";
        document.getElementById('last_mention_image').style.color = color;
        
    } else {
        who = "Anonymous " + pointed_info['target_num'] + " ";
        document.getElementById('last_mention_image').classList.add("blink");
    }
    setTimeout(() => {
        document.getElementById('last_mention_image').src = all_image_set[current_chosen][last_mention_idx];                    // [ny]src picked by a pointed out person on last defense
        document.getElementById('last_mention_evidence').src = all_image_set[current_chosen][pointed_info['pointed_img_idx']];  // [ny]Add evidence img by the not pointed out person yet
        
        var img_evidence = document.getElementById('last_mention_evidence');
        var img_last_mention = document.getElementById('last_mention_image');

        var last_mention_success = 'fail';
        console.log("img_evidence_src: ", img_evidence);
        console.log("img_last_mention_src: ", img_evidence);

        if(img_evidence.src == img_last_mention.src){
            last_mention_success = 'success';
        }
        else{
            last_mention_success = 'fail';
        }

        if (img_evidence.src == img_last_mention.src) {
            layout3('last_mention_success');
            document.getElementById('evidence_img_id').style.backgroundColor = '#EBC604';
            if(current_chosen != username){
                document.getElementById('last_correct').style.color = 'green';
                document.getElementById('last_correct').innerHTML = 'Match';
            }
            else{
                document.getElementById('survival_ment').style.color = 'green';
                document.getElementById('survival_ment').innerHTML = "<p>Match</p><p>&emsp;</p>";
            }
            setTimeout(()=>{
                layout3('after_success');
                next_point_out_bot();
            }, 3000);
        } else {
            layout3('last_mention_fail');
            document.getElementById('last_mention_image').classList.add('grayscale');

            if(username == current_chosen){
                var data = {
                    'username': username,
                    'fail_image' : all_imageid_set[username][pointed_info['pointed_img_idx']],
                    'command': 'history',
                }
                socket.send(JSON.stringify({
                    data
                }));
            }
            if(current_chosen != username){
                document.getElementById('last_mention_image').classList.remove('blink');
                document.getElementById('last_correct').style.color = 'red';
                document.getElementById('last_correct').innerHTML = 'Mismatch';
            }
            else{
                document.getElementById('survival_ment').style.color = 'red';
                document.getElementById('survival_ment').innerHTML = "<p style='font-size:12px;'>Mismatch</p><p>&emsp;</p>";
            }
            setTimeout(() => {
                layout3('after_fail');
                document.getElementById('find_bot_img_container').innerHTML = "";
                if (current_chosen == '봇') {
                    show_identity('봇');
                    //they_found_bot();
                } else {
                    show_identity(current_chosen);
                    // death(current_chosen);
                }
            }, 3000);
        }
        all_labeling_set[current_chosen][pointed_info['pointed_img_idx']] = 2; // [ny]Change as 2 because evidence submit is already done 
    }, 3000);
}

var dropouts = [];

/* [ds]show_identity function : Inspect the player if he is bot or human and deal with the death after that */
function show_identity(whom){
    notice("The identify of anony "+pointed_info['target_num']+" is..!", 'find_bot', '15px');
    /*[ny]figure out(aim is moving) animation*/
    document.getElementById('find_bot_img_container').innerHTML = '<img src="/static/images/aim.png" class="detect" style="width: 100px;"></img>';
    
    var identity_result = 'man';
    if(whom == '봇'){
        identity_result = 'bot';
    }
    
    setTimeout(()=>{
        if(whom == '봇'){   //[ny] If it is bot,
            notice("<span style='color:;color:rgb(255, 51, 5)'>the bot!<span>", 'find_bot', '20px');
            bot_death = true;
            /*[ny]bot is dead*/
            document.getElementById('find_bot_img_container').innerHTML = "<br><br><br><br><br><img src='/static/images/pixel_bot.png' class='blink' style='width:90px'>";
            /**/
            setTimeout(() => {
                next_point_out_bot();
            },3500);        //[ny]bring they_found_bot.
        }
        else{               //[ny]if it is human,
            survivors = arrayRemove(survivors, whom);
            select_order = arrayRemove(select_order, whom);
            survivor_count = survivors.length;
            document.getElementById('find_bot_timer').innerHTML = "";
            dropouts.push(whom);
            notice("<span style='color:rgb(255, 51, 5);'>a human player..</span>", 'find_bot', '20px');
            layout1('round_title', 'find_bot');
            if(pass_flag[whom] == 'true'){
                pass_count--;
                pass_flag[whom] = 'die';
            }
            /*[ny]human is dead*/
            document.getElementById('find_bot_img_container').innerHTML = "<br><br><br><br><br><br><br><br><img id = 'rip_id' src='/static/images/rip.png'>";
            document.getElementById('find_bot_img_container').innerHTML += "<img src='/static/images/ghost.png' id = 'ghost_id' class ='ghost'>"; //margin-left: -50px;
            /**/

            if (memlist[0] == username) {

                death_user = whom;
    
                var data = {
                    'username': username,
                    'death_user' : death_user,
                    'command': 'updateDB_userdeath',
                }
                socket.send(JSON.stringify({
                    data
                }));
            
            }
            setTimeout(()=>{
                history();
            },4000);

            setTimeout(() => {
                if(whom == username){   //[ny]If i am the dead person,
                    document.getElementById('game_body').classList.add('turn_grey');
                    document.getElementById('round_start').classList.add('turn_grey');
                    document.getElementById('waiting').classList.add('turn_grey');
                    document.getElementById('glance').classList.add('turn_grey');
                    document.getElementById('find_bot').classList.add('turn_grey');
                }
                next_point_out_bot();
            },10000);
        }
    },4000);
}

/* [ds]history function : Exposure the history session */
function history(){
    notice('Helpful Tips!', 'find_bot', '20px');

    if(hint.length == 1){   // [ny]Response of expert
        document.getElementById('find_bot_img_container').innerHTML = "<br><br>표정 전문가의 의견: <b style='color:#2E64FE;'>" + emotion_name[hint[0]] + "</b>";
        document.getElementById('find_bot_img_container').innerHTML += "<br><br><span><img id='preview' src='"+ all_image_set[anonymous_user[pointed_info['target_num']]][pointed_info['pointed_img_idx']]+"'\
         style='width:120px;'></span>";
        layout3('history_expert');
    }
    else{                   // [ny]Response of players
        document.getElementById('find_bot_img_container').innerHTML = "<br><span><img id='preview' src='"+ all_image_set[anonymous_user[pointed_info['target_num']]][pointed_info['pointed_img_idx']]+"'\
         style='width:70px;'></span>";
        document.getElementById('find_bot_img_container').innerHTML += "<canvas id='myChart'></canvas>";
        layout3('history_player');
    }

}


/*[ds] no_mention function : A function that is immediately called if the last defense is not made */
function no_mention(whom) {
    if(username == current_chosen){
        var data = {
            'username': username,
            'fail_image' : all_imageid_set[whom][pointed_info['pointed_img_idx']],
            'command': 'history',
        }
        socket.send(JSON.stringify({
            data
        }));
    }
    notice("The identify of anony " + pointed_info['target_num'] + " is..!", 'find_bot', '15px');
    /*[ny]Figure out animation*/
    document.getElementById('find_bot_img_container').innerHTML = '<img src="/static/images/aim.png" class="detect" style="width: 100px;"></img>';

    setTimeout(() => {
        survivors = arrayRemove(survivors, whom);
        select_order = arrayRemove(select_order, whom);
        survivor_count = survivors.length;
        document.getElementById('find_bot_timer').innerHTML = "";
        dropouts.push(whom);
        notice("a human player..", 'find_bot', '20px');
        layout1('round_title', 'find_bot');
        if (pass_flag[whom] == 'true') {
            pass_count--;
            pass_flag[whom] = 'die';
        }

        /*[ny]human is dead*/
        document.getElementById('find_bot_img_container').innerHTML = "<br><br><br><br><br><br><br><br><img id = 'rip_id' src='/static/images/rip.png'>";
        document.getElementById('find_bot_img_container').innerHTML += "<img src='/static/images/ghost.png' id = 'ghost_id' class ='ghost'>"; //margin-left: -50px;
        /**/

        if (memlist[0] == username) {

            death_user = whom;

            var data = {
                'username': username,
                'death_user' : death_user,
                'command': 'updateDB_userdeath',
            }
            socket.send(JSON.stringify({
                data
            }));
        
        }

        setTimeout(()=>{
            history();
        },4000);
        
        setTimeout(() => {
            if (whom == username) {     //[ny]If I am dead person,
                document.getElementById('game_body').classList.add('turn_grey');
                document.getElementById('round_start').classList.add('turn_grey');
                document.getElementById('waiting').classList.add('turn_grey');
                document.getElementById('glance').classList.add('turn_grey');
                document.getElementById('find_bot').classList.add('turn_grey');
            }
            next_point_out_bot();
        }, 10000);
    }, 4000);
}

/* [ds]getKeyByValue function : A function that finds the key using the value in dictionary */
function getKeyByValue(obj, value) {
    return Object.keys(obj).find(key => obj[key] === value);
}

/* [ds]go_next_round function: A function that lets the user move to next round*/
function go_next_round() {
    document.getElementById('find_bot_img_container').innerHTML = '<br><br><br><br><br><br><span class="next_span">Next</span><span class="space"></span><span class="next_span">Round!</span>';
    document.getElementById('find_bot_img_container').innerHTML += '<br><span class="next_span_info"><span class="space"></span>earned points▼</span>';

    var line1 = document.getElementById('find_bot_img_container');
    var line1Spans = document.querySelectorAll('.next_span');

        // [ny]pass animation
        TweenMax.set([line1], {
            x: -15
        })
        TweenMax.set([line1Spans], {
            alpha: 0
        })

        var tl = new TimelineMax({
            repeat: 0
        });
    
        tl.add(
            TweenMax.to(line1, .75, {
                x: 0,
            }),
            "start"
        )
        tl.add(
            TweenMax.staggerTo(line1Spans, .5, {
                alpha: 1,
            }, .05),
            "start"
        )

    setTimeout(() => {
        // [ny]init role
        vacate_find_bot_content();
        current_emotion = emotion_order[current_round-1];
        pointed_info = {
            'selector': '',
            'target_num': 123,
            'pointed_img_idx': 0123,
        };
        pass_count = 0;
        all_image_set = {};
        all_imageid_set = {};
        all_labeling_set = {};
        my_labeling = [0,0,0,0];
        my_images = [];
        current_selector_idx = 0;
        wait_queue = [];
        anonymous_user = {};
        pass_flag = {};

        waits.forEach((each_box) => {
            each_box.style.backgroundColor = '#dddddd';
        });
        elect_result['thumb_up'] = 0;
        elect_result['thumb_down'] = 0;
        //=============================
        document.getElementById('find_bot').style.display = "none";
        document.getElementById('round_start').style.display = "block";
        round();
    }, 3000);
}


function monitor() {
    document.getElementById('point_pass_yes_no_area').innerHTML = "<div id='watching'>Deactivated..</div>"
}

/* [ds]point_out_bot function : A function that figure out the bot in find_bot page */
function point_out_bot(current_selector) {

    var flag = false;
    if (pass_count >= survivor_count) {
        current_round++;
        var res = game_end();
        if(res == 'lose'){ // [ny]If i lose because of overround. 
            /*[ny]If I lose because round is over 4!*/
            gamestart = false;
            var get_money = 0;
            var get_exp = 200;
            var lose_reason = 'exceed';
            var flag_die = false;
            var now_round = current_round-1;

            window.location.href = '/game/ending/' + '?username=' + username + "&result=" + res + "&money=" + get_money + "&exp=" + get_exp +"&flag=" + flag_die + "&rsn=" + lose_reason + "&rnd=" + now_round;
        }
        else if (res != 'lose' && flag == false) {
            notice("<span style='color:rgb(7, 102, 7);'>"+(current_round-1)+"End of Round</span>",'find_bot','20px');
            layout3('vacate');

            if (memlist[0] == username) {

                gameusers = [...survivors];
                gameusers.push('봇');

                var data = {
                    'username': username,
                    'survivor_cnt': survivor_count,
                    'gameusers' : gameusers,
                    'command': 'updateDB_roundend',
                }
                socket.send(JSON.stringify({
                    data
                }));
            
            }

            go_next_round();
        }
        flag = true;
    }
    else {
        console.log('[ny]Current pointer is ', current_selector, ' [ny]!!!!');

        if (current_selector == username) {
            notice('Pointing out', 'find_bot', '20px'); 
            layout3('pointing');
            button_pointing_or_pass();
        } else {
            notice('Browse!', 'find_bot', '17px'); 
            layout3('wait_pointing');

            /*[ny]Quick glance while wating*/
            set_anonymous_btn();
            var target_num = 'who?';
            var anonymous_btn = document.querySelectorAll('.anonymous');
            anonymous_btn.forEach((target) => target.addEventListener("click", () => {
                anonymous_btn.forEach((each_btn) => {
                    each_btn.classList.remove("clicked");
                });
                target.classList.add("clicked");

                target_num = target.id.charAt(target.id.length - 1);
                var target_name = anonymous_user[target_num];
                var target_choice = all_labeling_set[target_name];

                show(target_name, target_choice, 'find_bot');
            }));

            if (dropouts.includes(username)) {
                monitor();
            }
        }
    }

}


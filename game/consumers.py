"""
Consumer config.

[ny]Definite consumer which is necessary to access the library of Channels to communicate with Websocket

"""
from channels.generic.websocket import AsyncWebsocketConsumer #websocket 사용 위한 consumer import
from .models import Channel_1,Channel_2, Channel_3, Channel_4, Entries #models import
from channels.db import database_sync_to_async #websocket에서 db 비동기 접근 위해 import
import json #consumer와 html 간 데이터는 json 포맷이므로 import
from channels.layers import get_channel_layer
from django.utils import timezone

import csv
import random
import numpy as np
import cntk as ct
from datetime import datetime

from PIL import Image
from .rect_util import Rect
import game.img_util as imgu

class RoomConsumer(AsyncWebsocketConsumer):
    """
    [ds]RoomConsumer define

    consumer class for communication between game/game.html and ws When accessing channel. 

    [Function]
    1) Register with db at entry and notify players in the channel of entry.
    2) Remove from db on exit and notify players in the channel of exit. 
    3) Load profiles on the html page upon entry/exit of new players during channel access.
    4) Notify the players in the channel when you click the Ready/Notready button..
    5) Synchronize memlist.
    6) Implement 'Waiting' on waiting display after labeling.
    7) Synchronize each of imgsets(all_image_set) and labeling sets(all_labeling_set).

    """
    async def connect(self):
        """
        [ds]RoomConsumer.connect(self)

        Functions that are asynchronously invoked on ws connection.

        """
        self.user = self.scope['url_route']['kwargs']['username']           #[ny]The user connected through this ws. Reset the user as the username delivered by url on websocket routing.
        self.room_number = self.scope['url_route']['kwargs']['room_num']    #[ny]The channel connected through this ws. Reset the channel as the room_num delivered by url on websocket routing.
        self.teamid = self.scope['url_route']['kwargs']['team_id']          #[ny]The team id of the user connected through this ws. 
        self.room_group_number = 'chat_%s' % self.room_number               #[ny]The group name gatherd the players connected on chanenl. ex)'chat_1'
        self.users ={} #전체 유저 리스트
        self.tempuser = ""      #[ny]The variable storing the users who pressed the ready/notready button 
        self.temp_imgid = ""    #[ny]Temporary variable storing id of the img to be sampled at this time
        self.temp_emoid = ""    #[ny]Temporary variable storing emotion of the img to be sampled at this time
        self.entry_enable = False
        self.all_imageid_set = {}
        self.all_labeling_set = {}
        self.curE = -1
        self.num_of_survivor = -1
        self.cur_chosen_user = ""
        self.cur_chosen_img = ""
        self.cur_agrees = ""
        self.gameusers = []
        self.deathuser = ""
        self.now = datetime.now()
        self.timestamp = self.now.strftime("%Y-%m-%d %H:%M:%S")
        self.fail_img = ""
        self.hints = []
        self.empties = []
        self.imgcsv = []

        print('[',self.get_time(), '] ', '[ ', self.user, ' ]', self.user, 'A websocek of [ny] is connected.');
        print('[',self.get_time(), '] ', '[ ', self.user, ' ]',self.user, 'Will register [ny]in the DB channel room.');

        ch_layer = get_channel_layer()
        all_chat = self.channel_layer.groups.keys()

        print('[',self.get_time(), '] ', "this is my self.channel_name: ", self.channel_name)
        print('[',self.get_time(), '] ', "this is my channel layer: ", ch_layer)

        await database_sync_to_async(self.db_add_user)()        #[ny]Register the player on db when connecting ws

        print('[',self.get_time(), '] ','[ ', self.user, ' ]',self.user, '[ny] Will be added in websocekt group.');


        await self.channel_layer.group_add(self.room_group_number, self.channel_name)       #[ny]Sending msg to channel group when connecting ws.
        print('[',self.get_time(), '] ',"this is all channels in the game: ", all_chat)
        print('[',self.get_time(), '] ',"all layers in this channel groups: ", self.channel_layer.groups.get(self.room_group_number, {}).items())

        await self.accept()


    async def disconnect(self, close_code):
        """
        [ds]RoomConsumer.disconnect(self, close_code)

        Functions that are asynchronously invoked on ws unconnection.

        """
        print('[',self.get_time(), '] ','[ ', self.user, ' ]','[ny]My websocket is unconnected.');
        print('[',self.get_time(), '] ','[ ', self.user, ' ]','[ny]Will reomve me from DB channel room.');
        await database_sync_to_async(self.db_remove_user)()     #[ny]Eliminate player from db when ws is unconnected

        #[ny]Inform who is elminated to every players when ws is unconnected 
        rm_user = {}
        rm_user['username'] = self.user
        rm_user['command'] = 'disconnect'
        text_data = json.dumps(rm_user) #[ny]Store name of players and informations of connect in json format together.

        print('[',self.get_time(), '] ','[ ', self.user, ' ]','[ny]Will notify I got removed to everyone.');
        #[ny]Send text_data to every players in channel
        await self.channel_layer.group_send(
            self.room_group_number,
            {
                'type': 'user_out', #[ny]async def user_out(self, event)
                'payload': text_data, 
            }
        )

        print('[',self.get_time(), '] ','[ ', self.user, ' ]', '[ny]Will remove me from websocket group.');
        #[ny]Remove from channel
        await self.channel_layer.group_discard(
            self.room_group_number,
            self.channel_name
        )


    async def receive(self, text_data):
        """
        [ds]RoomConsumer.receive(self, text_data)

        Functions that are asynchronously invoked on getting msg through ws.

        """
        command = json.loads(text_data)['data']['command']
        print('[',self.get_time(), '] ','[ ', self.user, ' ]','[ny]Got a new msg in websocket. [Instruction] ', command)
        
        if command == "connect" or command == "disconnect": #[ny]Send a msg to every players in channel
            await self.channel_layer.group_send(
                self.room_group_number,
                {
                    'type': 'user_in',
                    'payload': text_data,
                }
            )
        elif command == "userlist":                         #[ny]Send a confirmed version of the full list of players in the channel and their feelings.
            
            print('[',self.get_time(), '] ','[ ', self.user, ' ]', '[ny]Will access the DB channel room and get to know all the users who are currently entering.')
            await database_sync_to_async(self.db_search_user)() #[ny]Acquire the userlist from db.

            self.users = json.loads(self.users)
            data = {}
            data['userlist'] = self.users
            data['command'] = 'userlist'
            print('[',self.get_time(), '] ','[ ', self.user, ' ]', '[ny]They are all of users currently .', self.users)

            #[ny]Sending list of all users currently in the channel with the browser.
            await self.channel_layer.group_send(
                self.room_group_number,
                {
                    'type': 'lobby_flag',
                    'payload':data,
                }
            )


        elif command == "round_init":                       # [ny]Allocate imgs and Perform the bot expectation. 

            survivor_cnt = json.loads(text_data)['data']['survivor_cnt']
            self.num_of_survivor = survivor_cnt
            self.temp_emoid = json.loads(text_data)['data']['cur_emotion']

            print('[',self.get_time(), '] ','[ ', self.user, ' ]', '[ny]Will read sampling_300.csv.') 
            '''[ny]Reading sampling_300.csv'''
            path = './static/sampling_300.csv'
            f = open(path, 'r')
            rdr = csv.reader(f)
            lines = []

            for line in rdr:
                if line[0] == 'image':
                    continue
                else:
                    lines.append(line[0])
            f.close()
            self.imgcsv = lines
            self.empties = []
            await database_sync_to_async(self.priorities)() # [ny]Bring the totally empty entry first 

            print('[',self.get_time(), '] ','[ ', self.user, ' ] ','[ny]Will be sampling 4 imgs ramndomly.')

            assigned_imagesets = [[],[],[],[],[]]
            total_imgs = [] # [ny]Temporary list for duplicated inspection 

            for i in range(0, survivor_cnt+1):
                tmp_samples = []
                for j in range(0,4):
                    e_flag = False
                    while e_flag!=True:
                        if len(self.empties)!= 0:
                            self.temp_imgid = random.sample(self.empties,1)[0]
                            if self.temp_imgid in total_imgs:           # [ny]If I got sampled by someone in the team,
                                self.empties.remove(self.temp_imgid)
                                lines.remove(self.temp_imgid)
                                continue
                            else:
                                total_imgs.append(self.temp_imgid)
                                tmp_samples.append(self.temp_imgid)
                                self.empties.remove(self.temp_imgid)
                                lines.remove(self.temp_imgid)
                        else:
                            self.temp_imgid = random.sample(lines,1)[0] # [ny]one img sampling

                            if self.temp_imgid in total_imgs:           # [ny]If I got sampled by someone in the team,
                                lines.remove(self.temp_imgid)
                                continue
                            await database_sync_to_async(self.db_entry_enable)() #[ny]Inspect the rule of sapmling

                            if self.entry_enable == False:
                                lines.remove(self.temp_imgid)
                                continue
                            else:
                                total_imgs.append(self.temp_imgid)
                                tmp_samples.append(self.temp_imgid)
                                lines.remove(self.temp_imgid) 

                        e_flag = True

                assigned_imagesets[i] = tmp_samples
                print('[',self.get_time(), '] ',assigned_imagesets)
            
            print('[',self.get_time(), '] ','[ ', self.user, ' ] ', '[ny]Will expect the imgs which the bot has.')
            '''[ny]Expectation the bot'''
            bot_prediction = []
            bot_z = ct.Function.load(r'./static/bot.model')
            test_images = np.empty(shape=(1,1,64,64), dtype=np.float32)

            #Variables
            for i in range(0,4):
                test_img_path = r'./static/images/sampling_bot/'+ assigned_imagesets[survivor_cnt][i] +'.png'
            
                test_img_data = Image.open(test_img_path)
                test_img_data.load()

                test_box = [0, 0, 48, 48]
                test_face_rc = Rect(test_box)
    
                test_A, test_A_piv = imgu.compute_norm_mat(64,64)

                distorted_image = imgu.distort_img(test_img_data, test_face_rc, 64, 64, 0.0, 1.0, 0.0, 0.0, False)
                final_image = imgu.preproc_img(distorted_image, test_A, test_A_piv)
                test_images[0] = final_image

                bot_pred = ct.softmax(bot_z)
                pre = bot_pred.eval(test_images)[0].tolist()
                for i in range(0,8):
                    pre[i] = round(pre[i], 3)
                bot_prediction.append(pre)

            print("최종 bot_prediction: ", bot_prediction)
            new_data = {}
            new_data['command'] = command
            new_data['assigned_imagesets'] = assigned_imagesets
            new_data['bot_prediction'] = bot_prediction

            packed_data = json.dumps(new_data)  #[ny]Save player name and connect information in json format together.
            
            print('[',self.get_time(), '] ','[ ', self.user, ' ] ','[ny]Will send allocated imgset of 5 players and predicted value of bot to everyone.')
            print('[',self.get_time(), '] ','[ ', self.user, ' ] ', '[ny]The allocated imgset of individul is, ', assigned_imagesets)
            print('[',self.get_time(), '] ','[ ', self.user, ' ] ', '[ny]The predicted value of bot is, ', bot_prediction)

            await self.channel_layer.group_send(
                self.room_group_number,
                {
                    'type': 'init_and_predict',
                    'payload':packed_data,
                }
            )

        elif command == "btn_ready":        # [ny]Inform all the players in the channel who pressed the ready button.
            print('[',self.get_time(), '] ','[ ', self.user, ' ] ', '[ny]I will tell that I presssed the ready button to everyone.')
            await self.channel_layer.group_send(
                self.room_group_number,
                {
                    'type': 'ready',
                    'payload': text_data,
                }
            )

        elif command == "btn_notready":     # [ny]Inform all the players in the channel who pressed the notready button.
            print('[',self.get_time(), '] ','[ ', self.user, ' ] ', '[ny]I will tell that I pressed notready button to everyone.')
            await self.channel_layer.group_send(
                self.room_group_number,
                {
                    'type': 'notready',
                    'payload': text_data,
                }
            )

        elif command == "btn_labeling":     # [ny]Inform all the players in the channel who is done labeling.
            print('[',self.get_time(), '] ','[ ', self.user, ' ] ', '[ny]I will tell that I am done labeling to everyone.')
            await self.channel_layer.group_send(
                self.room_group_number,
                {
                    'type': 'labeling',
                    'payload': text_data,
                }
            )

        elif command == "selection":        # [ny]Inform all the players in the channel which img is picked by who. 
            print('[',self.get_time(), '] ','[ ', self.user, ' ] ', '[ny]I will tell which labeling I did to everyone.')

            await self.channel_layer.group_send(
                self.room_group_number,
                {
                    'type': 'selection',
                    'payload':text_data,
                }
            )

        elif command == "updateDB_labeling": # [ny]Update labeling and img info of player in channel to db.
            self.all_labeling_set = json.loads(text_data)['data']['all_labeling_set']
            self.all_imageid_set = json.loads(text_data)['data']['all_imageid_set']
            self.teamid = json.loads(text_data)['data']['teamid']
            self.gameusers = json.loads(text_data)['data']['gameusers']

            print('[',self.get_time(), '] ','all labeling set: ', self.all_labeling_set)
            print('[',self.get_time(), '] ','all imageid set: ', self.all_imageid_set)

            await database_sync_to_async(self.db_update_labeling)() #[ny]Update db

        elif command == "updateDB_pointing": #[ny]Update labeling info when pointing out
            self.num_of_survivor = json.loads(text_data)['data']['survivor_cnt']
            self.cur_chosen_user = json.loads(text_data)['data']['current_chosen_user']
            self.cur_chosen_img = json.loads(text_data)['data']['current_chosen_img']
            self.cur_agrees = json.loads(text_data)['data']['agreements']

            print('[',self.get_time(), '] ','current_chosen_user : ', self.cur_chosen_user)
            print('[',self.get_time(), '] ','current_chosen_img : ', self.cur_chosen_img)
            print('[',self.get_time(), '] ','agreements: ', self.cur_agrees)
            print('[',self.get_time(), '] ','current_survivors : ', self.num_of_survivor)

            await database_sync_to_async(self.db_update_pointing)() #[ny]Update db

        elif command == "updateDB_roundend": #[ny]Update blank implicit labeling when one round is done
            self.num_of_survivor = json.loads(text_data)['data']['survivor_cnt']
            self.gameusers = json.loads(text_data)['data']['gameusers']

            print('[',self.get_time(), '] ','num_of_survivor : ', self.num_of_survivor)
            print('[',self.get_time(), '] ','gameusers : ', self.gameusers)

            await database_sync_to_async(self.db_update_roundend)()

        elif command == "updateDB_roundstop": #[ny]Remove the blank implicit entry because of game over before one round is done
            self.gameusers = json.loads(text_data)['data']['gameusers']
            print('[',self.get_time(), '] ','gameusers : ', self.gameusers)
            await database_sync_to_async(self.db_delete_roundstop)()

        elif command == "updateDB_userdeath": #[ny]Remove the blank implicit entry when the user is killed by
            self.deathuser = json.loads(text_data)['data']['death_user']
            print('[',self.get_time(), '] ','deathuser : ', self.deathuser)
            await database_sync_to_async(self.db_delete_deathuser)()


        elif command == 'arrange_anonymous_order': # [ny]Inform all the players in the channel of anonymous order.
            print('[',self.get_time(), '] ','[ ', self.user, ' ] ', '[ny]Will inform the random anonymous order to everyone.')
            await self.channel_layer.group_send(
                self.room_group_number,
                {
                    'type': 'arranged_order',
                    'payload' : text_data,
                }
            )
        elif command == 'point':
            print('[',self.get_time(), '] ','[ ', self.user, ' ] ', '[ny]Will inform that i pointed out who as a bot.')
            await self.channel_layer.group_send(
                self.room_group_number,
                {
                    'type': 'point',
                    'payload': text_data,
                }
            )
        elif command == 'pass':
            print('[',self.get_time(), '] ','[ ', self.user, ' ] ', '[ny]Will inform that I gave up pointing out the bot and passed the step.')
            await self.channel_layer.group_send(
                self.room_group_number,
                {
                    'type': 'point',
                    'payload': text_data,
                }
            )
        
        elif command == 'elect_result':
            print('[',self.get_time(), '] ','[ ', self.user, ' ] ', '[ny]Will infrom my vote to everyone.')
            await self.channel_layer.group_send(
                self.room_group_number,
                {
                    'type':'point',
                    'payload': text_data,
                }
            )

        elif command == 'last_mention':
            print('[',self.get_time(), '] ','[ ', self.user, ' ] ', '[ny]Will inform the evidence in last defence  of me(or bot) to everyone.')
            await self.channel_layer.group_send(
                self.room_group_number,
                {
                    'type': 'point',
                    'payload': text_data,
                }
            )

        elif command == 'history':
            self.fail_img = json.loads(text_data)['data']['fail_image']
            await database_sync_to_async(self.db_history)()            
            print('[',self.get_time(), '] ','[ ', self.user, ' ] ', '[ny]Will inform my history session to everyone.')
            
            
            data = {}
            data['command'] = 'history'
            data['hint'] = self.hints
            print("this is hint label : ", self.hints)

            await self.channel_layer.group_send(
                self.room_group_number,
                {
                    'type': 'history',
                    'payload': data,
                }
            )
            # self.hints = json.loads(self.hints)
            

    async def user_in(self, event):
        """
        [ds]RoomConsumer.user_in(self, event)

        In receive(), a function that sends entry users and round-by-round emotions to all players in the channel.

        """
        data = event['payload']
        data = json.loads(data) #[ny]Load 'payload' data formatted in json from receive function. 
        
        '''정보 전송하기'''
        new_data = {}
        new_data['command'] = data['data']['command']
        new_data['emotions'] = data['data']['emotions']
        new_data['username'] = data['data']['username']
        print('[',self.get_time(), '] ','[ ', self.user, ' ]',self.user, " socket send to my browser: ", new_data['username']," [ny]has entered, and what is random feelings for each round? ", new_data['emotions'])

        await self.send(text_data=json.dumps({
            'payload':new_data,
        }))
        


    async def user_out(self, event):
        """
        [ds]RoomConsumer.user_out(self, event)

        In disconnect(), a function that sends exit users and to all players in the channel.

        """
        data = event['payload']
        data = json.loads(data)
        who = data['username']  #[ny] Who exited

        await self.send(text_data=json.dumps({
            'payload': data,
        }))
        print('[',self.get_time(), '] ','[ ', self.user, ' ]',who, '[ny]informed  is exited.');


    async def init_and_predict(self, event):
        """
        [ds]RoomConsumer.init_and_predict(self, event)

        A function that sends the finally allocated imgsets id list and the predicted value of the bot to all.

        """ 
        data = event['payload']
        data = json.loads(data)
        #print('[',self.get_time(), '] ',"")
        print('[',self.get_time(), '] ','[ ', self.user, ' ] ','[ny]sent the list of imgsets assigned to 5 people and the predictions of the bot.')

        await self.send(text_data=json.dumps({
            'payload' : data,
        }))



    async def ready(self, event):
        """
        [ds]RoomConsumer.ready(self, event)

        Functions that send to the browser who pressed the Ready button.

        """
        data = event['payload']
        data = json.loads(data)                     #[ny]Load 'payload' data formatted in json from receive function.
        self.tempuser = data['data']['username']    #[ny]A user who pressed the ready button
        print('[',self.get_time(), '] ','[ ', self.user, ' ] ', 'DB 채널방에 접근하여 ', self.tempuser,'가 준비했다고 갱신해주겠습니다.');
        await database_sync_to_async(self.db_update_ready)()    #[ny]Convert the ready attribute as true on db.

        #[ny]Sending msg to channels.js through ws channel.
        await self.send(text_data=json.dumps({
            'payload': data['data'], #[ny]Sending data with json format from receive function.
        }))

    async def notready(self, event):
        """
        [ds]RoomConsumer.ready(self, event)

        Functions that send to the browser who pressed the NotReady button.

        """
        data = event['payload']
        data = json.loads(data)     #[ny]Load 'payload' data formatted in json from receive function.
        self.tempuser = data['data']['username'] #[ny]User who pressed the notready button
        print('[',self.get_time(), '] ','[ ', self.user, ' ] ', '[ny]will approach the DB channel room and update that I canceled the ready.');
        await database_sync_to_async(self.db_update_notready)() #[ny]Convert the ready attribute on db.

        #[ny]Sending msg to channels.js through ws channel.
        await self.send(text_data=json.dumps({
            'payload': data['data'], #[ny]Sending data with json format from receive function.
        }))

    async def lobby_flag(self, event):
        """
        [ds]RoomConser.lobby_flag(self, event)

        It's a function that allows only one person to start when all the people gather in the lobby. 
        
        """
        data = event['payload']
        # data = json.loads(data)

        await self.send(text_data=json.dumps({
            'payload' : data,
        }))

    async def labeling(self, event):
        """
        [ds]RoomConsumer.labeling(self, event)

        Functions that send to the browser who pressed the labeling complete button.

        """
        data = event['payload']
        data = json.loads(data)

        await self.send(text_data=json.dumps({
            'payload' : data['data'],
        }))

    async def selection(self, event):
        """
        [ds]RoomConsumer.selection(self, event)

        A function that sends a browser to which image set a user was randomly assigned and which photo was clicked.
        
        """
        data = event['payload']
        data = json.loads(data)

        await self.send(text_data=json.dumps({
            'payload' : data['data'],
        }))


    async def arranged_order(self, event):
        """
        [ds]RoomConsumer.arranged_order(self, event)
        
        A function that sends a list anonymous_user to the browser that tells which number of people in the memlist are anonymous 1,2,3,4.

        """
        data = event['payload']
        data = json.loads(data)

        await self.send(text_data=json.dumps({
            'payload': data['data'],
        }))

    async def point(self, event):
        """
        [ds]RoomConsumer.point(self, event)

        A function that sends who clicked which img of what number anonymous to brwoser
        """
        data = event['payload']
        data = json.loads(data)

        await self.send(text_data=json.dumps({
            'payload': data['data'],
        }))

    async def history(self, event):
        """
        [ds]RoomConsumer.history(self, event)

        A function that transfers facial expressions inferred by experts/most players to give feedback on the evidence of a dead user.

        """
        data = event['payload']
        # data = json.loads(data)

        await self.send(text_data=json.dumps({
            'payload' : data,
        }))

    def db_history(self):
        """
        [ds]RoomConsumer.db_history(self)

        A function that brings emotions that will be a hint about the img that has been pointed out.

        """
        experts_flag = False
        e_label = ['0','1','2','3','4','5','6','7']
        majority = []
        print("self.fail_img: ", self.fail_img)
        all_entries = Entries.objects.filter(image_id=self.fail_img)

        for e in e_label:
            cur_entry = all_entries.get(emotion_id = e)
            if cur_entry.E1_implicit == "" and cur_entry.E2_implicit == "" and cur_entry.E3_implicit == "" :
                experts_flag = True
                break
            
        if experts_flag == False:      
            print("[ny]Pick all-time accumulated answers")  
            for e in e_label:
                cur_entry = all_entries.get(emotion_id = e)
                bunja = 0
                bunmo = 0
                if cur_entry.E1_implicit != "":
                    numbers = cur_entry.E1_implicit.split('/')
                    cur_bunja = float(numbers[0])
                    cur_bunmo = float(numbers[1])
                    bunmo += cur_bunmo
                    if cur_entry.E1_labeling == True:
                        bunja += cur_bunja
                    else:
                        bunja += (cur_bunmo - cur_bunja)

                if cur_entry.E2_implicit != "":
                    numbers = cur_entry.E2_implicit.split('/')
                    cur_bunja = float(numbers[0])
                    cur_bunmo = float(numbers[1])
                    bunmo += cur_bunmo
                    if cur_entry.E2_labeling == True:
                        bunja += cur_bunja
                    else:
                        bunja += (cur_bunmo - cur_bunja)

                if cur_entry.E3_implicit != "":
                    numbers = cur_entry.E3_implicit.split('/')
                    cur_bunja = float(numbers[0])
                    cur_bunmo = float(numbers[1])
                    bunmo += cur_bunmo
                    if cur_entry.E3_labeling == True:
                        bunja += cur_bunja
                    else:
                        bunja += (cur_bunmo - cur_bunja)
                    
                majority.append(round(bunja/bunmo,2)*100)
                print("*[ny]Emotion in this round : ", e, " [ny]The rate of people's agreement: ", majority[int(e)])
            
            self.hints = majority
        
        else:   #[ny]Show the labeling of expert
            path = './static/sampling_300.csv'
            f = open(path, 'r')
            rdr = csv.reader(f)
            lines = []

            for line in rdr:
                if line[0] == 'image':
                    continue
                else:
                    lines.append(line)
            f.close()

            for line in lines:
                if line[0] == self.fail_img:
                    e_label = line[1]
                    self.hints.append(e_label)
                    break

            
    def db_add_user(self):
        """
        [ds]RoomConsumer.db_add_user(self)

        Function to register players in db on ws connection.
        
        """

        #[ny]Check the room_number is what channel number
        if self.room_number == '1':
            channel_obj = Channel_1.objects
        elif self.room_number == '2':
            channel_obj = Channel_2.objects
        elif self.room_number == '3':
            channel_obj = Channel_3.objects
        elif self.room_number == '4':
            channel_obj = Channel_4.objects

        if not channel_obj.filter(user=self.user).exists(): #[ny]If the user didn't exist in db,
            channel_obj.create(user=self.user)              #[ny]Register the user who accesses the channel on the db.
            print('[',self.get_time(), '] ','[ ', self.user, ' ]',self.user, " [ny]safely registered in the db channel room")
        else:
            print('[',self.get_time(), '] ','[ ', self.user, ' ]',self.user, " didn't update db channel room because [ny] already existed in db channel room.")

        
        

    def db_remove_user(self):
        """
        [ds]RoomConsumer.db_remove_user(self)

       Function to remove players in db on ws unconnection.

        """
        if self.room_number == '1':
            channel_obj = Channel_1.objects
        elif self.room_number == '2':
            channel_obj = Channel_2.objects
        elif self.room_number == '3':
            channel_obj = Channel_3.objects
        elif self.room_number == '4':
            channel_obj = Channel_4.objects

        removed_user = channel_obj.get(user=self.user)  #[ny]After searching who will be removed on db,
        removed_user.delete()                           #[ny]Reomove the user from db.
        print('[',self.get_time(), '] ','[ ', self.user, ' ]',self.user, ' removed [ny] from db channel room.')


    def db_search_user(self):
        """
        [ds]RoomConsumer.db_search_user(self)

        Function to access db and get a list of all users in the channel.

        """
        if self.room_number == '1':
            channel_obj = Channel_1.objects
        elif self.room_number == '2':
            channel_obj = Channel_2.objects
        elif self.room_number == '3':
            channel_obj = Channel_3.objects
        elif self.room_number == '4':
            channel_obj = Channel_4.objects

        self.users = list(channel_obj.values_list('user', flat=True))
        self.users = json.dumps(self.users, ensure_ascii=False) #[ny]Bring userlist from db.
        print('[',self.get_time(), '] ','[ ', self.user, ' ]', '[ny]Successfully accessed the DB channel room and searched for users who are entering.');

    
    def db_update_ready(self):
        """
        [ds]RoomConsumer.db_update_ready(self)

        A function that converts the ready attribute of a user who approaches db and presses the Ready button to true.

        """
        if self.room_number == '1':
            channel_obj = Channel_1.objects
        elif self.room_number == '2':
            channel_obj = Channel_2.objects
        elif self.room_number == '3':
            channel_obj = Channel_3.objects
        elif self.room_number == '4':
            channel_obj = Channel_4.objects

        change_ready = channel_obj.get(user=self.tempuser) #[ny]self.tempuser who pressed the ready button
        if change_ready.ready == False:
            change_ready.ready = True   #[ny]After converting the ready attribute as true
            change_ready.save()         #[ny]Save db
            print('[',self.get_time(), '] ','[ ', self.user, ' ] ', '[ny]By accessing DB channel room ', self.tempuser, 'Updated that [ny] pressed the ready button.')


    def db_update_notready(self):
        """
        [ds]RoomConsumer.db_update_notready(self)

        A function that converts the ready attribute of a user who approaches db and presses the NotReady button to false.
        
        """
        if self.room_number == '1':
            channel_obj = Channel_1.objects
        elif self.room_number == '2':
            channel_obj = Channel_2.objects
        elif self.room_number == '3':
            channel_obj = Channel_3.objects
        elif self.room_number == '4':
            channel_obj = Channel_4.objects

        change_ready = channel_obj.get(user=self.tempuser)  #[ny]self.tempuser who pressed the notready button
        if change_ready.ready == True:
            change_ready.ready = False                      #[ny]After converting ready attribute as false
            change_ready.save()                             #[ny]Save db
            print('[',self.get_time(), '] ','[ ', self.user, ' ] ', '[ny]Update it by approaching the DB channel room and pressing the notready button.')
        else:
            print('[',self.get_time(), '] ','[ ', self.user, ' ] ', '[ny]approached the DB channel room, but it was alraedy canceled, so did not renew it')


    def priorities(self):
        """
        [ds]RoomConsumer.priorities(self)

        Access the db, enter and pull out a not touched image

        """
        print('[',self.get_time(), '] ',' self.emoid: ', self.temp_emoid, ' [ny]Pick the one which is not full with entry')
        for idx in range(0,len(self.imgcsv)):
            cur_entry = Entries.objects.get(image_id=self.imgcsv[idx], emotion_id=self.temp_emoid)
            if cur_entry.E1_flag == False:
                self.empties.append(self.imgcsv[idx])

        print('this is emties!! : \n', self.empties)





    def db_entry_enable(self):
        """
        [ds]RoomConsumer.db_entry_enable(self)

        A function that approaches db and checks if it is acceptable to sample images.
        (1) Check to see if Entry 3 is full.
        (2) Check if you've ever been exposed to this team.

        """
        print('[',self.get_time(), '] ','self.temp_imgid: ', self.temp_imgid, ' self.emoid: ', self.temp_emoid)
        cur_entry = Entries.objects.get(image_id=self.temp_imgid, emotion_id=self.temp_emoid)
        
        while True:
            if cur_entry.E1_flag == True and cur_entry.E2_flag == True and cur_entry.E3_flag == True:
                self.entry_enable = False
                print('[',self.get_time(), '] ','[ ', self.user, ' ] ', '[ny]Entry is full.')

                break
            else:
                self.entry_enable = True
                break
        
        print('[',self.get_time(), '] ','entry_enable: ', self.entry_enable)


    def db_update_labeling(self):
        """
        [ds]RoomConsumer.db_update_labeling(self)

        A function that accesses db and updates users' initial labeling information.
        (1) flag = true
        (2) teamid = 
        (3) labeler = 
        (4) labeling = 
        (5) time = 

        """
        for user in self.gameusers:
            print('[',self.get_time(), '] ','user : ', user)
            for i in range(0,4):
                cur_imgid = self.all_imageid_set[user][i]
                cur_labeling = self.all_labeling_set[user][i]
                cur_entry = Entries.objects.get(image_id=cur_imgid, emotion_id=self.temp_emoid)

                while True:
                    if cur_entry.E1_flag == False:
                        cur_entry.E1_flag = True
                        cur_entry.E1_teamid = self.teamid
                        cur_entry.E1_labeler = user
                        cur_entry.E1_labeling = cur_labeling
                        cur_entry.E1_time = timezone.now()
                        cur_entry.save()
                        print('[',self.get_time(), '] ','[labeling- ', user, ' ] ', self.all_imageid_set[user][i],'labeling of [ny] is E1', self.temp_emoid, '[ny]update on emotion.')
                        break
                    elif cur_entry.E2_flag == False:
                        cur_entry.E2_flag = True
                        cur_entry.E2_teamid = self.teamid
                        cur_entry.E2_labeler = user
                        cur_entry.E2_labeling = cur_labeling
                        cur_entry.E2_time = timezone.now()
                        cur_entry.save()
                        print('[',self.get_time(), '] ','[labeling- ', user, ' ] ', self.all_imageid_set[user][i],'labeling of [ny] is E2', self.temp_emoid, '[ny]update on emotion.')
                        break
                    elif cur_entry.E3_flag == False:
                        cur_entry.E3_flag = True
                        cur_entry.E3_teamid = self.teamid
                        cur_entry.E3_labeler = user
                        cur_entry.E3_labeling = cur_labeling
                        cur_entry.E3_time = timezone.now()
                        cur_entry.save()
                        print('[',self.get_time(), '] ','[labeling- ', user, ' ] ', self.all_imageid_set[user][i],'labeling of [ny] is E3', self.temp_emoid, '[ny]update on emotion.')
                        break

    def db_update_pointing(self):
        """
        [ds]RoomConsumer.db_update_pointing(self)

        A function that accesses db and updates labeling information when pointing out a bot
        (1) implicit

        """
        
        cur_entry = Entries.objects.get(image_id=self.cur_chosen_img, emotion_id=self.temp_emoid)
        if self.cur_chosen_user != '봇':
            self.cur_agrees += 1

        tmp_implicit = f'{self.cur_agrees}/{self.num_of_survivor}' # [ny]agree는 inclues the lable of itself.

        
        while True:
            if cur_entry.E3_flag == True:
                cur_entry.E3_implicit = tmp_implicit
                cur_entry.save()
                print('[',self.get_time(), '] ','[pointing- ', self.cur_chosen_user, ' ] ', self.cur_chosen_img,'[ny] is pointed out therefore implicit labeling is E3', self.temp_emoid, '[ny]update on emotion.')
                break
            elif cur_entry.E2_flag == True:
                cur_entry.E2_implicit = tmp_implicit
                cur_entry.save()
                print('[',self.get_time(), '] ','[pointing- ', self.cur_chosen_user, ' ] ', self.cur_chosen_img,'[ny] is pointed out therefore implicit labeling is E2', self.temp_emoid, '[ny]update on emotion.')
                break
            elif cur_entry.E1_flag == True:
                cur_entry.E1_implicit = tmp_implicit
                cur_entry.save()
                print('[',self.get_time(), '] ','[pointing- ', self.cur_chosen_user, ' ] ', self.cur_chosen_img,'[ny]is pointed out therefore implicit labeling is E1', self.temp_emoid, '[ny]update on emotion.')
                break

    
    def db_update_roundend(self):
        """
        [ds]RoomConsumer.db_update_roundend(self)

        A function that accesses db and updates labeling information when round is done
        (1) implicit
        """

        for user in self.gameusers:
            print('[',self.get_time(), '] ','user : ', user)
            for i in range(0,4):
                cur_imgid = self.all_imageid_set[user][i]
                cur_entry = Entries.objects.get(image_id=cur_imgid, emotion_id = self.temp_emoid)
                
                tmp_implicit = f'{self.num_of_survivor}/{self.num_of_survivor}'

                while True:
                    if cur_entry.E3_flag == True and cur_entry.E3_implicit == "":
                        cur_entry.E3_implicit = tmp_implicit
                        cur_entry.save()
                        print('[',self.get_time(), '] ','[roundend- ', user, ' ] ', cur_imgid,'[ny] has never been pointed out E3', self.temp_emoid, '[ny]implicit labeling is updated on emotion.')
                        break
                    elif cur_entry.E2_flag == True and cur_entry.E2_implicit == "":
                        cur_entry.E2_implicit = tmp_implicit
                        cur_entry.save()
                        print('[',self.get_time(), '] ','[roundend- ', user, ' ] ', cur_imgid,'[ny] has never been pointed out E2', self.temp_emoid, '[ny]implicit labeling is updated on emotion.')
                        break
                    elif cur_entry.E1_flag == True and cur_entry.E1_implicit == "":
                        cur_entry.E1_implicit = tmp_implicit
                        cur_entry.save()
                        print('[',self.get_time(), '] ','[roundend- ', user, ' ] ', cur_imgid,'[ny] has never been pointed out E1', self.temp_emoid, '[ny]implicit labeling is updated on emotion.')
                        break
                    else:
                        break


    def db_delete_roundstop(self):
        """
        [ds]RoomConsumer.db_delete_roundstop(self)

        When the game ends during the round, a function that empties out an image entry that has not completed the inspection
        (1) If the bot dies and wins the game
        (2) If two people die and lose the game

        gameusers = survivors + bot

        """
        for user in self.gameusers:
            print('[',self.get_time(), '] ','user : ', user)
            for i in range(0,4):
                cur_imgid = self.all_imageid_set[user][i]
                cur_entry = Entries.objects.get(image_id=cur_imgid, emotion_id = self.temp_emoid)

                while True:
                    if cur_entry.E3_flag == True and cur_entry.E3_implicit == "":
                        cur_entry.E3_flag = False
                        cur_entry.E3_teamid = ""
                        cur_entry.E3_labeler = ""
                        cur_entry.E3_labeling = None
                        cur_entry.E3_implicit = ""
                        cur_entry.E3_time = None
                        cur_entry.save()
                        print('[',self.get_time(), '] ','[roundstop- ', user, ' ] ', cur_imgid,'[ny] has never been pointed out E3', self.temp_emoid, '[ny]Reset the whole entry related to emotion.')
                        break
                    elif cur_entry.E2_flag == True and cur_entry.E2_implicit == "":
                        cur_entry.E2_flag = False
                        cur_entry.E2_teamid = ""
                        cur_entry.E2_labeler = ""
                        cur_entry.E2_labeling = None
                        cur_entry.E2_implicit = ""
                        cur_entry.E2_time = None
                        cur_entry.save()
                        print('[',self.get_time(), '] ','[roundstop- ', user, ' ] ', cur_imgid,'[ny] has never been pointed out E2', self.temp_emoid, '[ny]Reset the whole entry related to emotion.')
                        break
                    elif cur_entry.E1_flag == True and cur_entry.E1_implicit == "":
                        cur_entry.E1_flag = False
                        cur_entry.E1_teamid = ""
                        cur_entry.E1_labeler = ""
                        cur_entry.E1_labeling = None
                        cur_entry.E1_implicit = ""
                        cur_entry.E1_time = None
                        cur_entry.save()
                        print('[',self.get_time(), '] ','[roundstop- ', user, ' ] ', cur_imgid,'[ny] has never been pointed out E1', self.temp_emoid, '[ny]Reset the whole entry related to emotion.')
                        break
                    else:
                        break



    def db_delete_deathuser(self):
        """
        [ds]RoomConsumer.db_delete_deathuser(self)

        When human dies during the round, a function that empties out an image entry that has not completed the inspection about the user
        (1) If human dies (no mention / fail mention)

        """
        for i in range(0,4):
            cur_imgid = self.all_imageid_set[self.deathuser][i]
            cur_entry = Entries.objects.get(image_id=cur_imgid, emotion_id = self.temp_emoid)
            while True:
                if cur_entry.E3_flag == True and cur_entry.E3_implicit == "":
                    cur_entry.E3_flag = False
                    cur_entry.E3_teamid = ""
                    cur_entry.E3_labeler = ""
                    cur_entry.E3_labeling = None
                    cur_entry.E3_implicit = ""
                    cur_entry.E3_time = None
                    cur_entry.save()
                    print('[',self.get_time(), '] ','[deathuser- ', self.deathuser, ' ] ', cur_imgid,'[ny] has never been pointed out E3', self.temp_emoid, '[ny]Reset the whole entry related to emotion.')
                    break
                elif cur_entry.E2_flag == True and cur_entry.E2_implicit == "":
                    cur_entry.E2_flag = False
                    cur_entry.E2_teamid = ""
                    cur_entry.E2_labeler = ""
                    cur_entry.E2_labeling = None
                    cur_entry.E2_implicit = ""
                    cur_entry.E2_time = None
                    cur_entry.save()
                    print('[',self.get_time(), '] ','[deathuser- ', self.deathuser, ' ] ', cur_imgid,'[ny] has never been pointed out E2', self.temp_emoid, '[ny]Reset the whole entry related to emotion.')
                    break
                elif cur_entry.E1_flag == True and cur_entry.E1_implicit == "":
                    cur_entry.E1_flag = False
                    cur_entry.E1_teamid = ""
                    cur_entry.E1_labeler = ""
                    cur_entry.E1_labeling = None
                    cur_entry.E1_implicit = ""
                    cur_entry.E1_time = None
                    cur_entry.save()
                    print('[',self.get_time(), '] ','[deathuser- ', self.deathuser, ' ] ', cur_imgid,'[ny] has never been pointed out E1', self.temp_emoid, '[ny]Reset the whole entry related to emotion.')
                    break
                else:
                    break

    def get_time(self):
        """
        [ds]A fuction that is written to print out timestamp. 
        """
        self.now = datetime.now()
        self.timestamp = self.now.strftime("%Y-%m-%d %H:%M:%S")
        return self.timestamp
"""
views config.

[ny]Define the data will be handed over to url will do rendering

"""
from django.shortcuts import render,redirect
from django.contrib import messages
from .models import Member, Channel_1, Channel_2, Channel_3, Channel_4
import json

def index(request):
    """
    [ds]index Fuction.

    Rendering the login window on game/index.html. 
    """
    context = {}
    return render(request, 'game/index.html', context)

def info(request):
    """
    [ds]info function.

    Receive login information and deliver and render username and point to game/info.html.
    """
    username = request.GET.get('username')

    try:
        member_info = Member.objects.get(mem_name = username)
    except:
        messages.warning(request, "[ny]This nickname doesnt exist in")
        return redirect('index')
    else:
        user_point = member_info.mem_point
        user_exp = member_info.mem_exp
        user_level = member_info.mem_level

        members = list(Member.objects.all().order_by('-mem_point', '-mem_level', '-mem_exp')) # [ny]Sort and deliver scores
        context = {'username' : username, 'user_point' : user_point, 'user_exp': user_exp, 'user_level':user_level, 'ranking': members}
        return render(request, 'game/info.html', context)


def channels(request):
    """
    [ds]channels function.

    Transfer and render username to game/channels.html by clicking the enter channel button in game/info.html.
    """
    username = request.GET.get('username')
    context = {'username' : username}
    return render(request, 'game/channels.html', context)


def room(request, room_num):
    """
    [ds]room Fuction.

    Data transfer and rendering for entry and websocket connections upon channel selection in game/channels.html.
    """

    username = request.GET.get('username')
    member_info = Member.objects.get(mem_name = username)
    user_money = member_info.mem_point
    user_exp = member_info.mem_exp
    user_level = member_info.mem_level
    team_id = member_info.team_id

    if room_num == '1':
        channel_obj = Channel_1.objects
    elif room_num == '2':
        channel_obj = Channel_2.objects
    elif room_num == '3':
        channel_obj = Channel_3.objects
    elif room_num == '4':
        channel_obj = Channel_4.objects
    

    if channel_obj.all().count() >= 4 : #[ny]If there are more than four players currently connected in the channel,
        players = 'full'
        context = { 'room_num': room_num, 'username': username, 'players': players}
        return render(request, 'game/game.html', context)

    else :                              #[ny]If there are more less four players currently connected in the channel, 
        players = list(channel_obj.values_list('user', flat=True))  #[ny]user values_list registered on channel table
        json_players = json.dumps(players, ensure_ascii=False)      #[ny]change as json format
        
        flag_ready = list(channel_obj.values_list('ready', flat=True)) #[ny] ready values_list registered on channel table(If it is ready or not)
        json_ready = json.dumps(flag_ready) #change as json format

        members = list(Member.objects.all().order_by('-mem_point', '-mem_level', '-mem_exp')) # [ny]Sort and deliver scores

        
        context = {'room_num': room_num, 'username': username, 'players': json_players, 'ready': json_ready, 'user_money': user_money, 'user_exp': user_exp, 'user_level': user_level, 'ranking': members, 'team_id' : team_id}
        return render(request, 'game/game.html', context)

def ending(request):
    """
    [ds]ending Fuction. 
    
    Deliver data to game/ending.html and rendering .
    """

    '''[ny]Data to be handled out 
    # username
    # point
    # game result (win / lose)
    '''
    username = request.GET.get('username')
    result = request.GET.get('result')
    get_money = int(request.GET.get('money'))
    get_exp = int(request.GET.get('exp'))
    flag_die = request.GET.get('flag')
    lose_reason = request.GET.get('rsn')
    now_round = request.GET.get('rnd')

    member_info = Member.objects.get(mem_name = username)
    user_point = member_info.mem_point
    user_exp = member_info.mem_exp

    if result=='win':
        user_point += get_money
        member_info.mem_point = user_point #[ny]Update scores
    
    temp = (user_exp + get_exp)
    if temp >= 2000:
        member_info.mem_level += 1
        temp -= 2000

    member_info.mem_exp = temp
    member_info.save()

    context = {'username' : username, 'flag_die' : flag_die, 'now_round' : now_round, 'lose_reason' : lose_reason ,'result' : result}

    return render(request, 'game/ending.html', context)


def tutorial(request):
    #[ds]
    return render(request, 'game/tutorial.html')

def ajax_method(request):
    # [ds]
    receive_message = request.POST.get('send_data')
    send_message = {'send_data' : "I received"}
    return JsonResponse(send_message)

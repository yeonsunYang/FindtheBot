from django.db import models

class Member(models.Model):
    '''[ds]Table description
        table made from sql

    Attribites:
        models.Model : data explained by Model
        Member : name of table 

    Paramater:
        mem_id : id
        mem_name : user name
        mem_point : points of user
        mem_exp: exp of user
    '''
    mem_id = models.CharField(primary_key=True, max_length=8)
    team_id = models.CharField(max_length=8, null=True)
    mem_name = models.CharField(max_length=15, null=True)
    mem_point = models.PositiveIntegerField(default=0)
    mem_exp = models.PositiveIntegerField(default=0)
    mem_level = models.PositiveIntegerField(default=1)

    class Meta:
        app_label = 'game'

    def __str__(self):
        return f"Name: {self.mem_name}, Team_id: {self.team_id}, Mem_id: {self.mem_id}"


class Channel_1(models.Model):
    '''
    [ds]Channel_1 table
    
    A table that stores accessing players in channel 1 at that time

    Paramater:
        user : accessing player's username
        ready : flag to check if the accessing player is ready or not

    '''
    user = models.CharField(max_length=15, null=True)
    ready = models.BooleanField(default=False)    

    def __str__(self):
        return f"Name: {self.user}, Ready: {self.ready}"



class Channel_2(models.Model):
    '''
    [ds]Channel_2 table
    
    A table that stores accessing players in channel 2 at that time

    Paramater:
        user : accessing player's username
        ready : flag to check if the accessing player is ready or not


    '''
    user = models.CharField(max_length=15, null=True)
    ready = models.BooleanField(default=False)     



    def __str__(self):
        return f"Name: {self.user}, Ready: {self.ready}"
    

class Channel_3(models.Model):
    '''
    [ds]Channel_3 table
    
    A table that stores accessing players in channel 3 at that time

    Paramater:
        user : accessing player's username
        ready : flag to check if the accessing player is ready or not


    '''
    user = models.CharField(max_length=15, null=True)    
    ready = models.BooleanField(default=False)

  

    def __str__(self):
        return f"Name: {self.user}, Ready: {self.ready}"


class Channel_4(models.Model):
    '''
    [ds]Channel_4 table
    
    A table that stores accessing players in channel 4 at that time

    Paramater:
        user : accessing player's username
        ready : flag to check if the accessing player is ready or not


    '''
    user = models.CharField(max_length=15, null=True)    
    ready = models.BooleanField(default=False)

   

    def __str__(self):
        return f"Name: {self.user}, Ready: {self.ready}"


class Entries(models.Model):

    image_id = models.CharField(max_length=8, blank=True)
    emotion_id = models.CharField(max_length=8, blank = True)

    E1_flag = models.BooleanField(default=False)
    E2_flag = models.BooleanField(default=False)
    E3_flag = models.BooleanField(default=False)

    E1_teamid = models.CharField(max_length=8, blank=True)
    E2_teamid = models.CharField(max_length=8, blank=True)
    E3_teamid = models.CharField(max_length=8, blank=True)
    
    E1_labeler = models.CharField(max_length=8, blank=True)
    E2_labeler = models.CharField(max_length=8, blank=True)
    E3_labeler = models.CharField(max_length=8, blank=True)

    E1_labeling = models.BooleanField(null=True)
    E2_labeling = models.BooleanField(null=True)
    E3_labeling = models.BooleanField(null=True)


    E1_implicit = models.CharField(max_length=10, blank=True)
    E2_implicit = models.CharField(max_length=10, blank=True)
    E3_implicit = models.CharField(max_length=10, blank=True)

    E1_time = models.DateTimeField(null=True, blank=True)
    E2_time = models.DateTimeField(null=True, blank=True)
    E3_time = models.DateTimeField(null=True, blank=True)

    class Meta:
        indexes = [models.Index(fields = ['image_id'])]

    def __str__(self):
        return f"Image: {self.image_id}, Emotion: {self.emotion_id}"


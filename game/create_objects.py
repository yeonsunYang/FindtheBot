import os
import sys
import django

current_dir = os.path.dirname(os.path.abspath(__file__))
parent_dir = os.path.dirname(current_dir)
sys.path.append(parent_dir)

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from game.models import Entries
import csv

path = '../static/sampling_300.csv'
f=open(path,'r')
rdr = csv.reader(f)
lines = []

for line in rdr:
    if line[0] == 'image':
        continue
    else:
        lines.append(line[0])
f.close()

emo_labels = ['0','1','2','3','4','5','6','7']

#[ny]Create Entires Table to store images and emotions automatically
for idx in range(0,len(lines)):
    for emo_idx in range(0, len(emo_labels)):
        Entries.objects.create(image_id=lines[idx], emotion_id=emo_labels[emo_idx])

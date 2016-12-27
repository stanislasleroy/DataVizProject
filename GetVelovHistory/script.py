
import urllib2
import json
from pprint import pprint

with open('../stations.json') as data_file:
    data = json.load(data_file)

stations = [] 
for i in data['features']:
    stations.append(i['properties']['idstation'])

history = {}
temp = []
temp.append(stations[0])
temp.append(stations[1])
temp.append(stations[2])
temp.append(stations[3])

# for id in temp:
for id in stations:
    print "velov-" + str(id)
    url = "https://download.data.grandlyon.com/sos/velov?request=GetObservation&service=SOS&version=1.0.0&offering=reseau_velov&procedure=velov-" + id + "&observedProperty=bikes,bike-stands&eventTime=2016-12-22T09:00:00Z/2016-12-25T10:00:00Z&responseFormat=application/json"
    response = urllib2.urlopen(url)
    data = json.load(response)   

    history["velov-" + str(id)] = {}
    history["velov-" + str(id)]['values'] = data['ObservationCollection']['member'][0]['result']['DataArray']['values']


# url = "https://download.data.grandlyon.com/sos/velov?request=GetObservation&service=SOS&version=1.0.0&offering=reseau_velov&procedure=velov-10089&observedProperty=bikes,bike-stands&eventTime=2016-12-22T09:00:00Z/2016-12-25T10:00:00Z&responseFormat=application/json"
# response = urllib2.urlopen(url)
# data = json.load(response)   

# history["velov-" + str(id)] = {}
# history["velov-" + str(id)]['values'] = data['ObservationCollection']['member'][0]['result']['DataArray']['values']

jsonData=json.dumps(history)

# Ecriture dans un fichier
with open('history2.json', 'w') as outfile:
    json.dump(history, outfile)

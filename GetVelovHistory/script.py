
import urllib2
import json
from pprint import pprint

start_date = "2016-12-21"
start_hour = "00:00:00"

end_date = "2016-12-29"
end_hour = "00:00:00"

filename = "history4.json"

stations = [] 
history = {}

with open('../stations.json') as data_file:
    data = json.load(data_file)

for i in data['features']:
    stations.append(i['properties']['idstation'])

for id in stations:
    print "velov-" + str(id)
    url = "https://download.data.grandlyon.com/sos/velov?request=GetObservation&service=SOS&version=1.0.0&offering=reseau_velov&procedure=velov-" + id + "&observedProperty=bikes,bike-stands&eventTime=" + start_date + "T" + start_hour + "Z/" + end_date + "T" + end_hour + "Z&responseFormat=application/json"
    response = urllib2.urlopen(url)
    data = json.load(response)   

    history["velov-" + str(id)] = {}
    history["velov-" + str(id)]['values'] = data['ObservationCollection']['member'][0]['result']['DataArray']['values']

# Ecriture dans un fichier
with open(filename, 'w') as outfile:
    json.dump(history, outfile)

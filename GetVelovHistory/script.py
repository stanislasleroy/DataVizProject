
# import urllib, json
# url = "https://download.data.grandlyon.com/sos/velov?request=GetObservation&service=SOS&version=1.0.0&offering=reseau_velov&procedure=velov-6004&observedProperty=bikes&eventTime=2016-12-18T23:45:00Z/2016-12-25T00:15:00Z&responseFormat=application/json"
# response = urllib.urlopen(url)
# data = json.loads(response.read())
# print data


import urllib2
import json

url = "https://download.data.grandlyon.com/sos/velov?request=GetObservation&service=SOS&version=1.0.0&offering=reseau_velov&procedure=velov-6004&observedProperty=bikes&eventTime=2016-12-18T23:45:00Z/2017-01-30T00:15:00Z&responseFormat=application/json"
response = urllib2.urlopen(url)
data = json.load(response)   
print str(data)
use LWP::UserAgent;  
 use HTTP::Request;  

#  my $URL = 'https://www.twitter.com/';  
 my $URL = "https://download.data.grandlyon.com/sos/velov?request=GetObservation&service=SOS&version=1.0.0&offering=reseau_velov&procedure=velov-6004&observedProperty=bikes&eventTime=2016-12-18T23:45:00Z/2017-01-30T00:15:00Z&responseFormat=application/json"


 my $ua = LWP::UserAgent->new(ssl_opts => { verify_hostname => 1 });  
 my $header = HTTP::Request->new(GET => $URL);  
 my $request = HTTP::Request->new('GET', $URL, $header);  
 my $response = $ua->request($request);  

 if ($response->is_success){  
     print "URL:$URL\nHeaders:\n";  
     print $response->headers_as_string;  
 }elsif ($response->is_error){  
     print "Error:$URL\n";  
     print $response->error_as_HTML;  
 }  
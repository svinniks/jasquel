/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
package http;

import org.apache.http.Header;
import org.apache.http.HttpEntity;
import org.apache.http.client.methods.*;
import org.apache.http.conn.ssl.SSLConnectionSocketFactory;
import org.apache.http.conn.ssl.TrustStrategy;
import org.apache.http.impl.client.CloseableHttpClient;
import org.apache.http.impl.client.HttpClients;
import org.apache.http.ssl.SSLContextBuilder;
import org.apache.http.util.EntityUtils;

import javax.net.ssl.HostnameVerifier;
import javax.net.ssl.SSLSession;
import java.io.IOException;
import java.security.GeneralSecurityException;
import java.security.cert.X509Certificate;
import java.util.Map;
import java.util.logging.Level;

import static jasquel.common.Log.LOGGER;

/**
 *
 * @author s.vinniks
 */
public class HttpClient {
    
    private final CloseableHttpClient httpClient;
    
    public HttpClient() throws GeneralSecurityException {
        
        TrustStrategy trustStrategy = (X509Certificate[] chain, String authType) -> true;
        HostnameVerifier hostnameVerifier = (String hostname, SSLSession session) -> true;

        httpClient = HttpClients.custom()
                .setSSLSocketFactory(new SSLConnectionSocketFactory(
                        new SSLContextBuilder().loadTrustMaterial(trustStrategy).build(),
                        hostnameVerifier))
                .build();
        
    }
    
    private Response executeRequest(HttpRequestBase request, Map<String, String> headers) throws IOException {
        
        if (headers != null)
            for (Map.Entry<String, String> header : headers.entrySet())
                request.setHeader(header.getKey(), header.getValue());
        
        try (CloseableHttpResponse httpResponse = httpClient.execute(request)) {
            
            HttpEntity responseContent = httpResponse.getEntity();
            
            Response response;
            
            if (responseContent != null)
                response = new Response(httpResponse.getStatusLine().getStatusCode(), EntityUtils.toString(responseContent));
            else
                response = new Response(httpResponse.getStatusLine().getStatusCode(), null);
            
            for (Header header : httpResponse.getAllHeaders())
                response.headers.put(header.getName(), header.getValue());
            
            return response;
            
        }
        
    }
    
    public Response get(String url, Map<String, String> headers) throws IOException {
        
        HttpGet request = new HttpGet(url);
        
        return executeRequest(request, headers);
        
    }
    
    public Response post(String url, Map<String, String> headers, HttpEntity content) throws IOException {
        
        HttpPost request = new HttpPost(url);
        request.setEntity(content);
        
        return executeRequest(request, headers);
        
    }
    
    public Response post(String url, Map<String, String> headers) throws IOException {
        return post(url, headers, null);
    }

    public Response put(String url, Map<String, String> headers, HttpEntity content) throws IOException {
        
        HttpPut request = new HttpPut(url);
        request.setEntity(content);
        
        return executeRequest(request, headers);
        
    }
    
    public Response put(String url, Map<String, String> headers) throws IOException {
        return put(url, headers, null);
    }
    
    public Response delete(String url, Map<String, String> headers, HttpEntity content) throws IOException {
        
        HttpDeleteWithBody request = new HttpDeleteWithBody(url);
        request.setEntity(content);
        
        return executeRequest(request, headers);
        
    }
    
    public Response delete(String url, Map<String, String> headers) throws IOException {
        return delete(url, headers, null);
    }

    public Runnable deleteTask(String url, Map<String, String> headers, HttpEntity content) {
        return () -> {
            try {
                delete(url, headers, content);
            } catch (IOException ex) {
                LOGGER.log(Level.SEVERE, "An error occurred while executing HTTP DELETE task.", ex);
            }
        };
    }
    
}

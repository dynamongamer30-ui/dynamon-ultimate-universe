package com.dynamongamer.royalvoid;

import org.json.JSONObject;

public interface GameConnection {
    
    interface Callback {
        
        void result(JSONObject value);
    }
    
    void snapshot(Callback callback);
    
    void command(String name, JSONObject args, Callback callback);
    
    void close();
    
    boolean preview();
}

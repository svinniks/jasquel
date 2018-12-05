/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
package jasquel.common;

import java.util.LinkedHashMap;
import java.util.Map;

public class LRUCache<K,V> {

    private static final float LOAD_FACTOR = 0.75f;

    private final LinkedHashMap<K,V> map;
    private final int maxSize;

    public LRUCache(int size) {

        this.maxSize = size;
        int capacity = (int)Math.ceil(size / LOAD_FACTOR) + 1;

        map = new LinkedHashMap<K,V>(capacity, LOAD_FACTOR, true) {

            @Override 
            protected boolean removeEldestEntry (Map.Entry<K,V> eldest) {
                return size() > LRUCache.this.maxSize; 
            } 

        };

    };

    public synchronized V get(K key) {
       return map.get(key); 
    }

    public synchronized void put(K key, V value) {
       map.put(key, value); 
    }

    public synchronized void clear() {
       map.clear(); 
    }
    public synchronized int size() {
       return map.size(); 
    }

}
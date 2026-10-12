package com.myfitai.app;

import android.Manifest;
import android.content.Context;
import android.content.SharedPreferences;
import android.hardware.Sensor;
import android.hardware.SensorEvent;
import android.hardware.SensorEventListener;
import android.hardware.SensorManager;
import android.os.Build;
import com.getcapacitor.JSObject;
import com.getcapacitor.PermissionState;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;

@CapacitorPlugin(
    name = "Pedometer",
    permissions = {
        @Permission(
            alias = "activityRecognition",
            strings = { Manifest.permission.ACTIVITY_RECOGNITION }
        )
    }
)
public class PedometerPlugin extends Plugin implements SensorEventListener {

    private static final String PREFS_NAME = "myfitai_pedometer_prefs";
    private static final String KEY_LAST_RAW = "last_raw_steps";
    private static final String KEY_BASELINE = "sensor_baseline";
    private static final String KEY_REBOOT_OFFSET = "reboot_offset";

    private SensorManager sensorManager;
    private Sensor stepCounterSensor;
    private Sensor stepDetectorSensor;

    private boolean isListening = false;
    private int lastRawSteps = -1;
    private int baselineSteps = -1;
    private int rebootOffset = 0;

    @Override
    public void load() {
        super.load();
        Context ctx = getContext();
        if (ctx != null) {
            sensorManager = (SensorManager) ctx.getSystemService(Context.SENSOR_SERVICE);
            if (sensorManager != null) {
                stepCounterSensor = sensorManager.getDefaultSensor(Sensor.TYPE_STEP_COUNTER);
                stepDetectorSensor = sensorManager.getDefaultSensor(Sensor.TYPE_STEP_DETECTOR);
            }
            SharedPreferences prefs = ctx.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
            lastRawSteps = prefs.getInt(KEY_LAST_RAW, -1);
            baselineSteps = prefs.getInt(KEY_BASELINE, -1);
            rebootOffset = prefs.getInt(KEY_REBOOT_OFFSET, 0);
        }
    }

    @PluginMethod
    public void isAvailable(PluginCall call) {
        boolean hasCounter = stepCounterSensor != null;
        boolean hasDetector = stepDetectorSensor != null;
        JSObject ret = new JSObject();
        ret.put("available", hasCounter || hasDetector);
        ret.put("hasStepCounter", hasCounter);
        ret.put("hasStepDetector", hasDetector);
        call.resolve(ret);
    }

    @PluginMethod
    public void checkPermission(PluginCall call) {
        boolean granted = true;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            granted = getPermissionState("activityRecognition") == PermissionState.GRANTED;
        }
        JSObject ret = new JSObject();
        ret.put("granted", granted);
        call.resolve(ret);
    }

    @PluginMethod
    public void requestPermission(PluginCall call) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            if (getPermissionState("activityRecognition") != PermissionState.GRANTED) {
                requestPermissionForAlias("activityRecognition", call, "permissionCallback");
                return;
            }
        }
        JSObject ret = new JSObject();
        ret.put("granted", true);
        call.resolve(ret);
    }

    @PermissionCallback
    private void permissionCallback(PluginCall call) {
        boolean granted = true;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            granted = getPermissionState("activityRecognition") == PermissionState.GRANTED;
        }
        JSObject ret = new JSObject();
        ret.put("granted", granted);
        call.resolve(ret);
    }

    @PluginMethod
    public void startStepTracking(PluginCall call) {
        if (sensorManager == null) {
            call.reject("SensorManager unavailable on this device");
            return;
        }

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            if (getPermissionState("activityRecognition") != PermissionState.GRANTED) {
                call.reject("ACTIVITY_RECOGNITION permission required to access step sensor");
                return;
            }
        }

        if (!isListening) {
            boolean registered = false;
            if (stepCounterSensor != null) {
                registered = sensorManager.registerListener(this, stepCounterSensor, SensorManager.SENSOR_DELAY_UI);
            }
            if (stepDetectorSensor != null) {
                sensorManager.registerListener(this, stepDetectorSensor, SensorManager.SENSOR_DELAY_UI);
            }
            isListening = registered;
        }

        JSObject ret = new JSObject();
        ret.put("tracking", isListening);
        ret.put("lastRawSteps", lastRawSteps);
        ret.put("baselineSteps", baselineSteps);
        ret.put("rebootOffset", rebootOffset);
        call.resolve(ret);
    }

    @PluginMethod
    public void stopStepTracking(PluginCall call) {
        if (sensorManager != null && isListening) {
            sensorManager.unregisterListener(this);
            isListening = false;
        }
        JSObject ret = new JSObject();
        ret.put("tracking", false);
        call.resolve(ret);
    }

    @PluginMethod
    public void getSensorStatus(PluginCall call) {
        JSObject ret = new JSObject();
        ret.put("isListening", isListening);
        ret.put("available", stepCounterSensor != null || stepDetectorSensor != null);
        ret.put("lastRawSteps", lastRawSteps);
        ret.put("baselineSteps", baselineSteps);
        ret.put("rebootOffset", rebootOffset);
        call.resolve(ret);
    }

    @PluginMethod
    public void setBaseline(PluginCall call) {
        Integer newBaseline = call.getInt("baseline");
        Integer newOffset = call.getInt("rebootOffset", 0);
        if (newBaseline != null) {
            baselineSteps = newBaseline;
            rebootOffset = newOffset;
            persistState();
        }
        JSObject ret = new JSObject();
        ret.put("success", true);
        ret.put("baselineSteps", baselineSteps);
        ret.put("rebootOffset", rebootOffset);
        call.resolve(ret);
    }

    @Override
    public void onSensorChanged(SensorEvent event) {
        if (event == null || event.values == null || event.values.length == 0) return;

        if (event.sensor.getType() == Sensor.TYPE_STEP_COUNTER) {
            int currentRaw = (int) event.values[0];

            // Device reboot detection:
            // If current raw is significantly less than last seen raw, a reboot occurred
            if (lastRawSteps > 0 && currentRaw < lastRawSteps) {
                int deltaBeforeReboot = lastRawSteps - (baselineSteps > 0 ? baselineSteps : 0);
                if (deltaBeforeReboot > 0) {
                    rebootOffset += deltaBeforeReboot;
                }
                baselineSteps = currentRaw;
            } else if (baselineSteps < 0) {
                baselineSteps = currentRaw;
            }

            lastRawSteps = currentRaw;
            persistState();

            JSObject data = new JSObject();
            data.put("type", "step_counter");
            data.put("rawSteps", currentRaw);
            data.put("baselineSteps", baselineSteps);
            data.put("rebootOffset", rebootOffset);
            data.put("timestamp", System.currentTimeMillis());
            notifyListeners("stepEvent", data);

        } else if (event.sensor.getType() == Sensor.TYPE_STEP_DETECTOR) {
            JSObject data = new JSObject();
            data.put("type", "step_detector");
            data.put("steps", 1);
            data.put("timestamp", System.currentTimeMillis());
            notifyListeners("stepEvent", data);
        }
    }

    @Override
    public void onAccuracyChanged(Sensor sensor, int accuracy) {
        // No-op for step counters
    }

    private void persistState() {
        Context ctx = getContext();
        if (ctx != null) {
            SharedPreferences.Editor editor = ctx.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE).edit();
            editor.putInt(KEY_LAST_RAW, lastRawSteps);
            editor.putInt(KEY_BASELINE, baselineSteps);
            editor.putInt(KEY_REBOOT_OFFSET, rebootOffset);
            editor.apply();
        }
    }

    @Override
    protected void handleOnDestroy() {
        if (sensorManager != null && isListening) {
            sensorManager.unregisterListener(this);
            isListening = false;
        }
        super.handleOnDestroy();
    }
}

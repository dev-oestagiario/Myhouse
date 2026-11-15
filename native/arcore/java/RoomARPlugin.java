package com.myhouse.app;

import android.app.Activity;
import android.content.Intent;

import androidx.activity.result.ActivityResult;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.ActivityCallback;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.google.ar.core.ArCoreApk;

/**
 * Optional ARCore bridge: checks actual device support and opens the native measurement
 * screen. Does not upload frames or persist any images or raw 3D points.
 */
@CapacitorPlugin(name = "RoomAR")
public class RoomARPlugin extends Plugin {
    @PluginMethod
    public void availability(PluginCall call) {
        ArCoreApk.getInstance().checkAvailabilityAsync(getContext(), state -> {
            JSObject result = new JSObject();
            result.put("supported", state.isSupported());
            result.put("installed", state == ArCoreApk.Availability.SUPPORTED_INSTALLED);
            result.put("status", state.name());
            call.resolve(result);
        });
    }

    @PluginMethod
    public void measure(PluginCall call) {
        ArCoreApk.getInstance().checkAvailabilityAsync(getContext(), state -> {
            if (!state.isSupported()) {
                call.reject("Este aparelho não suporta ARCore. Use as medidas manuais.", "AR_UNAVAILABLE");
                return;
            }
            Intent intent = new Intent(getContext(), RoomArMeasureActivity.class);
            startActivityForResult(call, intent, "measurementFinished");
        });
    }

    @ActivityCallback
    private void measurementFinished(PluginCall call, ActivityResult result) {
        if (call == null) return;
        if (result.getResultCode() != Activity.RESULT_OK || result.getData() == null) {
            call.reject("Medição por realidade aumentada cancelada.", "AR_CANCELLED");
            return;
        }
        Intent data = result.getData();
        float width = data.getFloatExtra("width", Float.NaN);
        float length = data.getFloatExtra("length", Float.NaN);
        if (!Float.isFinite(width) || !Float.isFinite(length)
                || width < 0.1f || length < 0.1f || width > 100 || length > 100) {
            call.reject("O ARCore não retornou medidas válidas.", "AR_INVALID_RESULT");
            return;
        }
        JSObject output = new JSObject();
        output.put("width", Math.round(width * 100f) / 100d);
        output.put("length", Math.round(length * 100f) / 100d);
        output.put("depthSupported", data.getBooleanExtra("depthSupported", false));
        output.put("depthUsed", data.getBooleanExtra("depthUsed", false));
        output.put("method", "arcore-hit-test");
        call.resolve(output);
    }
}

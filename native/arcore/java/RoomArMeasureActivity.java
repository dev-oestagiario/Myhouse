package com.myhouse.app;

import android.Manifest;
import android.app.Activity;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.graphics.Color;
import android.opengl.GLES11Ext;
import android.opengl.GLES20;
import android.opengl.GLSurfaceView;
import android.os.Bundle;
import android.view.Gravity;
import android.view.MotionEvent;
import android.view.Surface;
import android.view.View;
import android.widget.Button;
import android.widget.FrameLayout;
import android.widget.LinearLayout;
import android.widget.TextView;

import com.google.ar.core.Anchor;
import com.google.ar.core.ArCoreApk;
import com.google.ar.core.Config;
import com.google.ar.core.Coordinates2d;
import com.google.ar.core.DepthPoint;
import com.google.ar.core.Frame;
import com.google.ar.core.HitResult;
import com.google.ar.core.Plane;
import com.google.ar.core.Pose;
import com.google.ar.core.Session;
import com.google.ar.core.Trackable;
import com.google.ar.core.TrackingState;

import java.nio.ByteBuffer;
import java.nio.ByteOrder;
import java.nio.FloatBuffer;
import java.util.ArrayList;
import java.util.List;

import javax.microedition.khronos.egl.EGLConfig;
import javax.microedition.khronos.opengles.GL10;

/**
 * Optional ARCore measurement screen. The user taps two positions on the
 * floor for width and two more for length. Height is NEVER inferred.
 *
 * Points are short-lived native ARCore anchors. No camera frames, anchors,
 * coordinates or images leave the device or go to Supabase.
 */
public final class RoomArMeasureActivity extends Activity implements GLSurfaceView.Renderer {
    private static final int REQUEST_CAMERA = 80;
    private static final int BACKGROUND = Color.rgb(19, 39, 33);
    private final ArrayList<Anchor> anchors = new ArrayList<>();
    private final ArrayList<Boolean> depthHits = new ArrayList<>();

    private GLSurfaceView surface;
    private Frame lastFrame;
    private Session session;
    private TextView instructions;
    private TextView progress;
    private Button confirm;
    private boolean installedPromptRequested = true;
    private boolean glRunning;
    private boolean depthSupported;
    private int cameraTexture;
    private int program;
    private int positionAttribute;
    private int textureAttribute;
    private int textureUniform;
    private int screenWidth = 1;
    private int screenHeight = 1;
    private FloatBuffer quadVertices;
    private FloatBuffer textureVertices;

    private static final float[] QUAD = { -1f,-1f,  1f,-1f, -1f,1f,  1f,1f };
    private static final float[] VIEW_UV = { 0f,1f, 1f,1f, 0f,0f, 1f,0f };

    @Override
    public void onCreate(Bundle state) {
        super.onCreate(state);
        setResult(RESULT_CANCELED);
        getWindow().setStatusBarColor(BACKGROUND);
        getWindow().setNavigationBarColor(BACKGROUND);

        FrameLayout root = new FrameLayout(this);
        surface = new GLSurfaceView(this);
        surface.setEGLContextClientVersion(2);
        surface.setPreserveEGLContextOnPause(true);
        surface.setRenderer(this);
        surface.setRenderMode(GLSurfaceView.RENDERMODE_CONTINUOUSLY);
        surface.setOnTouchListener((view, event) -> {
            if (event.getAction() != MotionEvent.ACTION_UP) return true;
            final float x = event.getX();
            final float y = event.getY();
            surface.queueEvent(() -> captureTap(x, y));
            return true;
        });
        root.addView(surface);

        LinearLayout overlay = new LinearLayout(this);
        overlay.setOrientation(LinearLayout.VERTICAL);
        overlay.setPadding(dp(18), dp(15), dp(18), dp(18));
        overlay.setBackgroundColor(0xE6193029);

        TextView heading = label("Medir cômodo com ARCore", 19);
        heading.setTypeface(null, 1);
        overlay.addView(heading);

        instructions = label("Mova a câmera pelo piso para identificar uma superfície.", 14);
        instructions.setPadding(0, dp(9), 0, dp(7));
        overlay.addView(instructions);
        progress = label("0 de 4 pontos • medição aproximada", 13);
        overlay.addView(progress);

        LinearLayout buttons = new LinearLayout(this);
        buttons.setGravity(Gravity.CENTER_VERTICAL);
        buttons.setOrientation(LinearLayout.HORIZONTAL);
        buttons.setPadding(0, dp(13), 0, 0);
        Button undo = actionButton("Desfazer", buttons);
        Button restart = actionButton("Reiniciar", buttons);
        confirm = actionButton("Usar medidas", buttons);
        confirm.setEnabled(false);
        undo.setOnClickListener(v -> {
            surface.queueEvent(() -> {
                if (!anchors.isEmpty()) {
                    anchors.remove(anchors.size()-1).detach();
                    depthHits.remove(depthHits.size()-1);
                }
                renderProgress(null);
            });
        });
        restart.setOnClickListener(v -> surface.queueEvent(() -> {
            releaseAnchors();
            renderProgress(null);
        }));
        confirm.setOnClickListener(v -> surface.queueEvent(this::finishWithMeasurement));
        overlay.addView(buttons);
        root.addView(overlay, new FrameLayout.LayoutParams(-1, -2, Gravity.BOTTOM));

        Button close = new Button(this);
        close.setText("Fechar");
        close.setContentDescription("Sair da medição AR e manter as medidas manuais");
        close.setOnClickListener(v -> finish());
        FrameLayout.LayoutParams closeParams = new FrameLayout.LayoutParams(-2, -2, Gravity.TOP | Gravity.END);
        closeParams.setMargins(0, dp(18), dp(12), 0);
        root.addView(close, closeParams);

        setContentView(root);
        renderProgress(null);
    }

    private Button actionButton(String title, LinearLayout parent) {
        Button button = new Button(this);
        button.setText(title);
        button.setTextSize(11f);
        LinearLayout.LayoutParams params = new LinearLayout.LayoutParams(0, dp(52), 1);
        parent.addView(button, params);
        return button;
    }

    private TextView label(String text, int size) {
        TextView label = new TextView(this);
        label.setText(text);
        label.setTextColor(Color.WHITE);
        label.setTextSize(size);
        return label;
    }

    private int dp(int value) {
        return Math.round(getResources().getDisplayMetrics().density * value);
    }

    private void startArSession() {
        if (checkSelfPermission(Manifest.permission.CAMERA) != PackageManager.PERMISSION_GRANTED) {
            requestPermissions(new String[]{Manifest.permission.CAMERA}, REQUEST_CAMERA);
            return;
        }
        if (session == null) {
            try {
                ArCoreApk.InstallStatus installed = ArCoreApk.getInstance().requestInstall(this, installedPromptRequested);
                if (installed == ArCoreApk.InstallStatus.INSTALL_REQUESTED) {
                    installedPromptRequested = false;
                    report("Instale/atualize o ARCore e retorne para continuar.");
                    return;
                }
                session = new Session(this);
                Config config = session.getConfig();
                depthSupported = session.isDepthModeSupported(Config.DepthMode.AUTOMATIC);
                if (depthSupported) config.setDepthMode(Config.DepthMode.AUTOMATIC);
                session.configure(config);
            } catch (Exception e) {
                report("Não foi possível iniciar o ARCore. Volte e insira medidas manualmente.");
                return;
            }
        }
        try {
            session.resume();
            if (!glRunning) {
                surface.onResume();
                glRunning = true;
            }
            report("Mova lentamente o celular e toque em dois pontos do piso para medir a largura.");
        } catch (Exception e) {
            report("Câmera/ARCore indisponível. Volte e use o modo manual.");
        }
    }

    @Override
    protected void onResume() {
        super.onResume();
        startArSession();
    }

    @Override
    protected void onPause() {
        if (glRunning) {
            surface.onPause();
            glRunning = false;
        }
        if (session != null) {
            try { session.pause(); } catch (Exception ignored) { }
        }
        super.onPause();
    }

    @Override
    protected void onDestroy() {
        releaseAnchors();
        if (session != null) {
            session.close();
            session = null;
        }
        super.onDestroy();
    }

    @Override
    public void onRequestPermissionsResult(int requestCode, String[] permissions, int[] results) {
        super.onRequestPermissionsResult(requestCode, permissions, results);
        if (requestCode != REQUEST_CAMERA) return;
        if (results.length > 0 && results[0] == PackageManager.PERMISSION_GRANTED) {
            startArSession();
        } else {
            report("Sem permissão de câmera: a medição AR não está disponível. Use a medição manual.");
        }
    }

    private void report(String text) {
        runOnUiThread(() -> instructions.setText(text));
    }

    @Override
    public void onSurfaceCreated(GL10 gl, EGLConfig config) {
        GLES20.glClearColor(0.08f, 0.14f, 0.12f, 1f);
        int[] ids = new int[1];
        GLES20.glGenTextures(1, ids, 0);
        cameraTexture = ids[0];
        GLES20.glBindTexture(GLES11Ext.GL_TEXTURE_EXTERNAL_OES, cameraTexture);
        GLES20.glTexParameteri(GLES11Ext.GL_TEXTURE_EXTERNAL_OES, GLES20.GL_TEXTURE_MIN_FILTER, GLES20.GL_LINEAR);
        GLES20.glTexParameteri(GLES11Ext.GL_TEXTURE_EXTERNAL_OES, GLES20.GL_TEXTURE_MAG_FILTER, GLES20.GL_LINEAR);
        GLES20.glTexParameteri(GLES11Ext.GL_TEXTURE_EXTERNAL_OES, GLES20.GL_TEXTURE_WRAP_S, GLES20.GL_CLAMP_TO_EDGE);
        GLES20.glTexParameteri(GLES11Ext.GL_TEXTURE_EXTERNAL_OES, GLES20.GL_TEXTURE_WRAP_T, GLES20.GL_CLAMP_TO_EDGE);

        String vertex = "attribute vec2 a_Position; attribute vec2 a_Texture; varying vec2 v_Texture; void main(){gl_Position=vec4(a_Position,0.0,1.0);v_Texture=a_Texture;}";
        String fragment = "#extension GL_OES_EGL_image_external : require\nprecision mediump float;varying vec2 v_Texture;uniform samplerExternalOES u_Texture;void main(){gl_FragColor=texture2D(u_Texture,v_Texture);}";
        int vertShader = compile(GLES20.GL_VERTEX_SHADER, vertex);
        int fragShader = compile(GLES20.GL_FRAGMENT_SHADER, fragment);
        program = GLES20.glCreateProgram();
        GLES20.glAttachShader(program, vertShader);
        GLES20.glAttachShader(program, fragShader);
        GLES20.glLinkProgram(program);
        positionAttribute = GLES20.glGetAttribLocation(program, "a_Position");
        textureAttribute = GLES20.glGetAttribLocation(program, "a_Texture");
        textureUniform = GLES20.glGetUniformLocation(program, "u_Texture");
        quadVertices = buffer(QUAD);
        textureVertices = buffer(VIEW_UV);
    }

    private static FloatBuffer buffer(float[] values) {
        FloatBuffer b = ByteBuffer.allocateDirect(values.length * 4).order(ByteOrder.nativeOrder()).asFloatBuffer();
        b.put(values).position(0);
        return b;
    }

    private int compile(int kind, String shaderSource) {
        int shader = GLES20.glCreateShader(kind);
        GLES20.glShaderSource(shader, shaderSource);
        GLES20.glCompileShader(shader);
        return shader;
    }

    @Override
    public void onSurfaceChanged(GL10 gl, int width, int height) {
        screenWidth = Math.max(1, width);
        screenHeight = Math.max(1, height);
        GLES20.glViewport(0, 0, screenWidth, screenHeight);
    }

    @Override
    public void onDrawFrame(GL10 gl) {
        GLES20.glClear(GLES20.GL_COLOR_BUFFER_BIT);
        if (session == null || cameraTexture == 0) return;
        try {
            int rotation = getWindowManager().getDefaultDisplay().getRotation();
            session.setDisplayGeometry(rotation, screenWidth, screenHeight);
            session.setCameraTextureName(cameraTexture);
            Frame frame = session.update();
            lastFrame = frame;

            float[] transformed = new float[8];
            frame.transformCoordinates2d(Coordinates2d.VIEW_NORMALIZED, VIEW_UV, Coordinates2d.TEXTURE_NORMALIZED, transformed);
            textureVertices.position(0);
            textureVertices.put(transformed).position(0);

            GLES20.glUseProgram(program);
            GLES20.glActiveTexture(GLES20.GL_TEXTURE0);
            GLES20.glBindTexture(GLES11Ext.GL_TEXTURE_EXTERNAL_OES, cameraTexture);
            GLES20.glUniform1i(textureUniform, 0);
            GLES20.glEnableVertexAttribArray(positionAttribute);
            GLES20.glEnableVertexAttribArray(textureAttribute);
            quadVertices.position(0);
            GLES20.glVertexAttribPointer(positionAttribute, 2, GLES20.GL_FLOAT, false, 0, quadVertices);
            GLES20.glVertexAttribPointer(textureAttribute, 2, GLES20.GL_FLOAT, false, 0, textureVertices);
            GLES20.glDrawArrays(GLES20.GL_TRIANGLE_STRIP, 0, 4);
            GLES20.glDisableVertexAttribArray(positionAttribute);
            GLES20.glDisableVertexAttribArray(textureAttribute);
        } catch (Exception e) {
            report("Rastreamento interrompido. Tente novamente ou use medidas manuais.");
        }
    }

    private void captureTap(float x, float y) {
        if (anchors.size() >= 4 || lastFrame == null) return;
        if (lastFrame.getCamera().getTrackingState() != TrackingState.TRACKING) {
            report("Aguarde a câmera rastrear o ambiente. Mova-a devagar sobre o piso.");
            return;
        }

        HitResult floorHit = null;
        HitResult depthHit = null;
        for (HitResult hit : lastFrame.hitTest(x, y)) {
            Trackable candidate = hit.getTrackable();
            if (candidate instanceof Plane) {
                Plane plane = (Plane) candidate;
                if (plane.getTrackingState() == TrackingState.TRACKING &&
                    plane.getType() == Plane.Type.HORIZONTAL_UPWARD_FACING &&
                    plane.isPoseInPolygon(hit.getHitPose())) {
                    floorHit = hit;
                    break;
                }
            } else if (candidate instanceof DepthPoint &&
                candidate.getTrackingState() == TrackingState.TRACKING &&
                depthHit == null) {
                depthHit = hit;
            }
        }
        HitResult chosen = floorHit != null ? floorHit : depthHit;
        if (chosen == null) {
            report("Não detectei um ponto confiável no piso. Aponte para uma região com textura e tente novamente.");
            return;
        }

        Anchor newAnchor;
        try { newAnchor = chosen.createAnchor(); }
        catch (Exception e) {
            report("Não foi possível fixar este ponto. Tente outra posição no piso.");
            return;
        }
        if (anchors.size() % 2 == 1) {
            Pose first = anchors.get(anchors.size() - 1).getPose();
            Pose second = newAnchor.getPose();
            float difference = Math.abs(first.ty() - second.ty());
            float distance = horizontalDistance(first, second);
            if (difference > 0.22f || distance < 0.1f || distance > 100f) {
                newAnchor.detach();
                report("Pontos incompatíveis com o mesmo piso ou muito próximos. Escolha outra posição.");
                return;
            }
        }
        anchors.add(newAnchor);
        depthHits.add(floorHit == null);
        renderProgress(null);
    }

    private static float horizontalDistance(Pose a, Pose b) {
        return (float) Math.hypot(a.tx() - b.tx(), a.tz() - b.tz());
    }

    private void renderProgress(String explicitMessage) {
        int count = anchors.size();
        final String[] steps = {
            "Toque no primeiro ponto do piso para medir a largura.",
            "Toque no segundo ponto do piso para fechar a largura.",
            "Agora toque no primeiro ponto para medir o comprimento.",
            "Toque no segundo ponto para fechar o comprimento.",
            "Medição concluída. Confira os resultados antes de usar."
        };
        String details = explicitMessage == null ? steps[count] : explicitMessage;
        if (count >= 2) details += String.format(java.util.Locale.forLanguageTag("pt-BR"), " Largura: %.2f m.", horizontalDistance(anchors.get(0).getPose(), anchors.get(1).getPose()));
        if (count == 4) details += String.format(java.util.Locale.forLanguageTag("pt-BR"), " Comprimento: %.2f m.", horizontalDistance(anchors.get(2).getPose(), anchors.get(3).getPose()));
        if (depthHits.contains(true)) details += " Foram usados pontos de profundidade: confirme com trena.";
        String finalDetails = details;
        runOnUiThread(() -> {
            instructions.setText(finalDetails);
            progress.setText(count + " de 4 pontos • altura será informada manualmente");
            confirm.setEnabled(count == 4);
        });
    }

    private void finishWithMeasurement() {
        if (anchors.size() != 4) return;
        float width = horizontalDistance(anchors.get(0).getPose(), anchors.get(1).getPose());
        float length = horizontalDistance(anchors.get(2).getPose(), anchors.get(3).getPose());
        if (width < 0.1f || length < 0.1f || width > 100 || length > 100) {
            report("As medidas ficaram fora do intervalo aceito. Refaça a captura.");
            return;
        }
        Intent data = new Intent();
        data.putExtra("width", width);
        data.putExtra("length", length);
        data.putExtra("depthSupported", depthSupported);
        data.putExtra("depthUsed", depthHits.contains(true));
        runOnUiThread(() -> {
            setResult(RESULT_OK, data);
            finish();
        });
    }

    private void releaseAnchors() {
        for (Anchor anchor : anchors) {
            try { anchor.detach(); } catch (Exception ignored) { }
        }
        anchors.clear();
        depthHits.clear();
    }
}

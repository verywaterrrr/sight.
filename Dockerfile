FROM ubuntu:24.04
ENV DEBIAN_FRONTEND=noninteractive PYTHONUNBUFFERED=1 PORT=8080 \
    AUDIVERIS_CLI=/opt/audiveris/bin/Audiveris \
    TESSDATA_PREFIX=/opt/tessdata \
    JAVA_TOOL_OPTIONS="-Djava.awt.headless=true -Xmx512m -XX:ActiveProcessorCount=1 -XX:+UseSerialGC" \
    OMP_THREAD_LIMIT=1 GDK_SCALE=1
RUN apt-get update && apt-get install -y --no-install-recommends python3 python3-venv curl ca-certificates fontconfig fonts-dejavu-core libgomp1 shared-mime-info \
    && curl -fL https://github.com/Audiveris/audiveris/releases/download/5.11.0/Audiveris-5.11.0-ubuntu24.04-x86_64.deb -o /tmp/audiveris.deb \
    && echo 'f20113aaa33b3149ec8d6a09b2a7963360e65fafd92d69389987a85bbc3ec7a3  /tmp/audiveris.deb' | sha256sum -c - \
    && mkdir -p /usr/share/desktop-directories \
    && apt-get install -y --no-install-recommends /tmp/audiveris.deb \
    && sed -i -e 's/java-options=-Xms512m/java-options=-Xms128m/' -e 's/java-options=-Xmx8G/java-options=-Xmx512m/' /opt/audiveris/lib/app/Audiveris.cfg \
    && mkdir -p /opt/tessdata \
    && curl -fL https://raw.githubusercontent.com/tesseract-ocr/tessdata/c2b2e0df86272ce11be323f23f96cf656565ed41/eng.traineddata -o /opt/tessdata/eng.traineddata \
    && echo 'daa0c97d651c19fba3b25e81317cd697e9908c8208090c94c3905381c23fc047  /opt/tessdata/eng.traineddata' | sha256sum -c - \
    && python3 -m venv /opt/venv && /opt/venv/bin/pip install --no-cache-dir pypdf==6.10.0 \
    && rm -rf /var/lib/apt/lists/* /tmp/audiveris.deb
WORKDIR /app
COPY . .
RUN test -x "$AUDIVERIS_CLI" \
    && /opt/audiveris/lib/runtime/bin/java $(sed -n '/^java-options=-Xm/s/^java-options=//p' /opt/audiveris/lib/app/Audiveris.cfg) -XX:+PrintFlagsFinal -version 2>&1 | grep -E 'MaxHeapSize[[:space:]]*=[[:space:]]*536870912' \
    && "$AUDIVERIS_CLI" -batch -help
EXPOSE 8080
CMD ["/opt/venv/bin/python3", "server/service.py"]

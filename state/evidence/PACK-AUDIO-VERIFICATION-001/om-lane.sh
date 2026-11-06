#!/bin/bash
# Bring up one remote whisper lane correctly (per-host home paths, espeak-ng present).
# usage: om-lane.sh <ssh-host> <home-on-host> <sample-shard-workers> <full-shard-workers> <shard-ids-file>
set -u
SUDO_PASSWORD="$(grep '^SUDO_PASSWORD=' "$HOME/.hermes/.env" | cut -d= -f2- | tr -d '\"')"
H=$1; HO=$2; SW=$3; FW=$4; IDS=$5
REPO=/home/hunter/game-dev/LTS
EV=$REPO/state/evidence/PACK-AUDIO-VERIFICATION-001
BASE=$EV/full-audit-2026-10-28
LANES=$EV/lanes
BENCH=$HOME/.cache/lts-bench
RH=$HO/.cache/lts-reaudit
TAG=$(echo "$H" | tr -c 'a-zA-Z0-9' '-')

ssh -o ConnectTimeout=8 "$H" "bash -lc 'command -v espeak-ng >/dev/null || { printf %s\n \"$SUDO_PASSWORD\" | sudo -S pacman -S --noconfirm --needed espeak-ng >/dev/null 2>&1; }; command -v espeak-ng'" || { echo "$H NO_ESPEAK"; exit 1; }
ssh "$H" "bash -lc 'mkdir -p $RH/whisper.cpp $RH/scripts $RH/lane'"
rsync -a "$BENCH/whisper.cpp/build" "$H:$RH/whisper.cpp/"
rsync -a "$BENCH/ggml-large-v3-turbo.bin" "$H:$RH/"
rsync -a "$REPO/scripts/qa-asr.py" "$H:$RH/scripts/"
rsync -a --delete "$REPO/languages/ru-RU" "$H:$RH/"
rsync -a "$LANES/sample-ids.txt" "$LANES/$IDS" "$H:$RH/lane/"
ssh "$H" "bash -lc 'printf \"#!/bin/bash\nexport LD_LIBRARY_PATH=$RH/whisper.cpp/build/bin\nexec $RH/whisper.cpp/build/bin/whisper-cli -ng \\\"\\\$@\\\"\n\" > $RH/whisper-gate.sh; chmod +x $RH/whisper-gate.sh'"
L=$(sha256sum "$BENCH/whisper.cpp/build/bin/whisper-cli" | cut -d' ' -f1)
R=$(ssh "$H" "bash -lc 'sha256sum $RH/whisper.cpp/build/bin/whisper-cli'" | awk '{print $1}')
M=$(sha256sum "$BENCH/ggml-large-v3-turbo.bin" | cut -d' ' -f1)
RM=$(ssh "$H" "bash -lc 'sha256sum $RH/ggml-large-v3-turbo.bin'" | awk '{print $1}')
[ "$L" = "$R" ] && [ "$M" = "$RM" ] || { echo "LANE_${TAG}_SHA_FAIL"; exit 1; }
echo "SHA_VERIFIED $H"

SOUT=sample-$TAG.jsonl
ssh "$H" "bash -lc 'rm -f $RH/lane/$SOUT $RH/lane/$SOUT.done; cd $RH && nohup setsid python3 scripts/qa-asr.py --pack $RH/ru-RU --model $RH/ggml-large-v3-turbo.bin --whisper $RH/whisper-gate.sh --lang russian --workers $SW --ids $RH/lane/sample-ids.txt --out $RH/lane/$SOUT > $RH/lane/$SOUT.log 2>&1; touch $RH/lane/$SOUT.done' >/dev/null 2>&1 </dev/null &"
echo "SAMPLE_STARTED $H"
while ! ssh "$H" "bash -lc 'test -f $RH/lane/$SOUT.done && echo y'" | grep -q y; do sleep 30; done
rsync -a "$H:$RH/lane/$SOUT" "$LANES/remote-$TAG-$SOUT"
if python3 "$EV/compare_lane.py" "$BASE/asr-ru-RU.jsonl" "$LANES/remote-$TAG-$SOUT" "$TAG"; then
  FOUT=asr-$TAG.jsonl
  ssh "$H" "bash -lc 'cd $RH && nohup setsid python3 scripts/qa-asr.py --pack $RH/ru-RU --model $RH/ggml-large-v3-turbo.bin --whisper $RH/whisper-gate.sh --lang russian --workers $FW --ids $RH/lane/$IDS --out $RH/lane/$FOUT > $RH/lane/$FOUT.log 2>&1; touch $RH/lane/$FOUT.done' >/dev/null 2>&1 </dev/null &"
  echo "FULL_LANE_STARTED $H"
  while ! ssh "$H" "bash -lc 'test -f $RH/lane/$FOUT.done && echo y'" | grep -q y; do sleep 60; done
  rsync -a "$H:$RH/lane/$FOUT" "$LANES/$FOUT"
  echo "LANE_COLLECTED $H $FOUT"
else
  echo "LANE_${TAG}_REJECT"
fi

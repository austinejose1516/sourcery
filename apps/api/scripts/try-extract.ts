/**
 * Risk-1 gate (Technical Spec §11/§12 step 1): does a video actually flow
 * through OpenRouter to Gemini and come back as schema-valid recipe JSON?
 *
 * Run BEFORE wiring the app:
 *   pnpm -F api try-extract                 # uses a small public sample clip
 *   pnpm -F api try-extract <video-url>     # use a real Malayalam cooking video
 *
 * The default sample is NOT a cooking video — it only proves the transport and
 * structured-output path. Pass a real recipe video to judge extraction quality.
 */
import { getExtractor } from '../src/lib/extractor';

const DEFAULT_SAMPLE =
  'https://test-videos.co.uk/vids/bigbuckbunny/mp4/h264/360/Big_Buck_Bunny_360_10s_1MB.mp4';

async function main() {
  const videoUri = process.argv[2] ?? DEFAULT_SAMPLE;
  console.log(`[try-extract] video: ${videoUri}`);
  console.time('[try-extract] elapsed');

  const recipe = await getExtractor().extract({ videoUri });

  console.timeEnd('[try-extract] elapsed');
  console.log('\n[try-extract] ✅ schema-valid recipe:\n');
  console.log(JSON.stringify(recipe, null, 2));
}

main().catch((err) => {
  console.error('\n[try-extract] ❌ failed:\n', err);
  process.exit(1);
});

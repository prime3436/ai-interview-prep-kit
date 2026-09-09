import fs from 'fs';
import path from 'path';
import { program } from 'commander';
import dotenv from 'dotenv';
import { BatchCaseInput, BatchCaseOutput, BatchOutputFile } from './types.js';
import { runPrepKitPipeline } from './pipeline.js';
import { validateBatchInput, cleanKitForExport, validateKit } from './validator.js';

dotenv.config();

// Ensure local URLs are permitted during batch evaluations (e.g. against local test harnesses)
process.env.ALLOW_LOCAL_URLS = 'true';

async function main() {
  program
    .name('evaluate')
    .description('Trao AI Interview Prep Kit - Mandatory Batch Evaluator (Section 9)')
    .option('-i, --input <path>', 'Path to input cases JSON file')
    .option('-o, --output <path>', 'Path to output kits JSON file')
    .argument('[input]', 'Input file path (positional fallback)')
    .argument('[output]', 'Output file path (positional fallback)')
    .allowUnknownOption(true)
    .parse(process.argv);

  const options = program.opts();
  const args = program.args;

  // Resolve input and output from flags or positional arguments
  const inputArg = options.input || args[0];
  const outputArg = options.output || args[1];

  if (!inputArg || !outputArg) {
    console.error('[Evaluate] Usage: npm run evaluate -- --input <cases.json> --output <kits.json>');
    console.error('           or:   npm run evaluate -- <cases.json> <kits.json>');
    process.exit(1);
  }

  const inputPath = path.resolve(process.cwd(), inputArg);
  const outputPath = path.resolve(process.cwd(), outputArg);

  console.log(`[Evaluate] Reading cases from: ${inputPath}`);

  if (!fs.existsSync(inputPath)) {
    console.error(`[Evaluate] Error: Input file does not exist: ${inputPath}`);
    process.exit(1);
  }

  let rawData: any;
  try {
    const fileContent = fs.readFileSync(inputPath, 'utf-8');
    rawData = JSON.parse(fileContent);
  } catch (err: any) {
    console.error(`[Evaluate] Error reading/parsing JSON: ${err.message}`);
    process.exit(1);
  }

  const validation = validateBatchInput(rawData);
  if (!validation.valid || !validation.cases) {
    console.error(`[Evaluate] Input validation errors:`, validation.errors);
    process.exit(1);
  }

  const cases: BatchCaseInput[] = validation.cases;
  console.log(`[Evaluate] Loaded ${cases.length} evaluation case(s). Starting execution pipeline...\n`);

  const results: BatchCaseOutput[] = [];

  for (let i = 0; i < cases.length; i++) {
    const testCase = cases[i];
    console.log(`------------------------------------------------------------`);
    console.log(`[Evaluate] Case ${i + 1}/${cases.length} [ID: ${testCase.id}]`);
    console.log(`  Company URL: ${testCase.company_url}`);
    console.log(`  Days:        ${testCase.days}`);
    console.log(`  JD Length:   ${testCase.jd.length} chars`);

    const startTime = Date.now();

    try {
      // Run identical core pipeline as the web application
      const kit = await runPrepKitPipeline({
        jd: testCase.jd,
        companyUrl: testCase.company_url,
        days: testCase.days,
        allowLocal: true, // Crucial: support local test addresses like http://localhost:8099/
        onProgress: p => {
          console.log(`  [Progress ${p.progressPercent}%] ${p.message}`);
        },
      });

      // Validate Appendix A conformity
      const kitValidation = validateKit(kit);
      if (!kitValidation.valid) {
        console.warn(`  [Warning] Kit schema notice: ${kitValidation.errors.join(', ')}`);
      }

      const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
      console.log(`  [OK] Case "${testCase.id}" completed in ${elapsed}s`);

      results.push({
        id: testCase.id,
        status: 'ok',
        kit: cleanKitForExport(kit),
        error: null,
      });
    } catch (caseErr: any) {
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
      console.error(`  [FAILED] Case "${testCase.id}" failed after ${elapsed}s: ${caseErr.message}`);

      // Gracefully record failure rather than aborting run (Section 9 Requirement)
      let errorCode = 'PIPELINE_ERROR';
      if (caseErr.message.includes('unreachable') || caseErr.message.includes('fetch')) {
        errorCode = 'COMPANY_UNREACHABLE';
      } else if (caseErr.message.includes('rate limit') || caseErr.message.includes('429')) {
        errorCode = 'RATE_LIMIT_EXCEEDED';
      }

      results.push({
        id: testCase.id,
        status: 'failed',
        kit: null,
        error: {
          code: errorCode,
          message: caseErr.message || 'Unknown processing error',
        },
      });
    }
  }

  // Write exact Appendix B Output Shape
  const outputData: BatchOutputFile = {
    version: '1.0',
    generated_at: new Date().toISOString(),
    kits: results,
  };

  // Ensure output directory exists
  const outDir = path.dirname(outputPath);
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  fs.writeFileSync(outputPath, JSON.stringify(outputData, null, 2), 'utf-8');

  console.log(`\n============================================================`);
  console.log(`[Evaluate] Evaluation run finished!`);
  console.log(`  Total Cases: ${cases.length}`);
  console.log(`  Successful:  ${results.filter(r => r.status === 'ok').length}`);
  console.log(`  Failed:      ${results.filter(r => r.status === 'failed').length}`);
  console.log(`  Output file: ${outputPath}`);
  console.log(`============================================================\n`);
}

main().catch(err => {
  console.error('[Evaluate] Fatal error in evaluation runner:', err);
  process.exit(1);
});

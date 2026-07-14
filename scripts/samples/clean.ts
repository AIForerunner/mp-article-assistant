import { cleanGeneratedSamples } from "./utils/storage";

cleanGeneratedSamples()
  .then(() => {
    console.log("Removed generated sample captures and latest reports.");
  })
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });

import { runAggregationJob } from "../aggregation-job";

console.log("Manually triggering wind data aggregation job...");
runAggregationJob()
  .then(() => {
    console.log("Manual aggregation job completed. Exiting...");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Error running manual aggregation job:", error);
    process.exit(1);
  });
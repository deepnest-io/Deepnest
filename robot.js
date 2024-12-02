const waitFor = (predicate) =>
  new Promise(async (resolve) => {
    while (!(await predicate())) {
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
    resolve();
  });

(async () => {
  const wait = waitFor(
    () =>
      document.querySelector("#partscroll > table > tbody").children.length > 0
  );
  document.getElementById("import").click();
  await wait;
  document.getElementById("addsheet").click();
  document.getElementById("sheetwidth").value = "$width";
  document.getElementById("sheetheight").value = "$height";
  document.getElementById("confirmsheet").click();
  document.getElementById("startnest").click();
  await waitFor(() => document.getElementById("nestlist").children.length > 0);
  document.getElementById("export").click();
  document.getElementById("exportsvg").click();

  return window.DeepNest.nests;
})();

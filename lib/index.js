const axios = require("axios");

exports.index_description = "the index";

exports.get_post_1 = async () => {
  await axios.get("https://jsonplaceholder.typicode.com/posts/1").then(r => {
    console.log(r.data);
  });
};

exports.print_user = async token => {
  await axios
    .post(
      "https://api.github.com/graphql",
      {
        query: `query { viewer { login } }`
      },
      {
        headers: {
          Authorization: `bearer ${token}`,
          "Content-Type": "application/json"
        }
      }
    )
    .then(r => {
      console.log(r.data);
    })
    .catch(err => {
      console.error(err);
      console.error(`problem encountered getting the user`);
      process.exit(1);
    });
};

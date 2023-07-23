# REST Between Sets

<i>Rest Between Sets is no longer live</i>

---

REST Between Sets (~~[Login](http://www.restbetweensets.com)~~, ~~[API](http://www.restbetweensets.com/API)~~) is a RESTful API for an exercise library.

<img src="img/rest-between-sets-api.png" width="600">

The API supports CRUD operations for two entities: Exercises and Movements. 

- Exercises are various physical activities i.e. Barbell Back Squat. 
- Movements are used to categorize exercises into broad movement categories i.e. Squat.
- Exercises & Movements can only be viewed & edited by the creating user.

<u>How to use:</u>

- Register at ~~[restbetweensets.com](http://restbetweensets.com)~~ and sign in to get a JWT.
- Make HTTP requests with the Authorization header set to "Bearer \<JWT\>".
  - Or simply use the ~~[Swagger UI](http://restbetweensets.com/api)~~ with your \<JWT\> for authorization.

Visit ~~[http://restbetweensets.com/api](http://restbetweensets.com/api)~~ for documentation and usage.

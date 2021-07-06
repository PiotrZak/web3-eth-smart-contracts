


export class HelloController {
  constructor(
    @repository(HelloRepository) protected repository: HelloRepository,
  ) {}

  // returns a list of our objects
  @get('/messages')

  }
}
import asyncio
import tornado.web


class MainHandler(tornado.web.RequestHandler):
    def get(self):
        print("Returning dummy user")
        self.set_header("Content-Type", "application/json")
        dummy_user = {"kind": "user", "admin": True, "groups": ["lect1:instructor"], "name": "instructor"}
        self.write(dummy_user)


def make_app():
    return tornado.web.Application([
        (r"/hub/api/user", MainHandler),
    ])


async def main():
    app = make_app()
    app.listen(8081)
    await asyncio.Event().wait()


if __name__ == "__main__":
    asyncio.run(main())

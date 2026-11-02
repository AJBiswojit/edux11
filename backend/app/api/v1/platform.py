from fastapi import APIRouter
from sqlalchemy import select

from app.core.deps import DbDep
from app.models.ops import ContactInquiry, NewsletterSubscriber
from app.services.spa_payloads import payload

router = APIRouter(tags=["platform"])


def _platform(db) -> dict:
    return payload("platform", db)


@router.get("/platform/site")
def site(db: DbDep):
    return _platform(db)


@router.get("/platform/testimonials")
def testimonials(db: DbDep):
    return {"items": _platform(db).get("testimonials") or []}


@router.get("/platform/pricing")
def pricing(db: DbDep):
    return {"plans": _platform(db).get("pricing") or []}


@router.get("/platform/faqs")
def faqs(db: DbDep):
    return {"items": _platform(db).get("faqs") or []}


@router.get("/platform/blog")
def blog(db: DbDep):
    return {"posts": _platform(db).get("blog") or []}


@router.get("/platform/blog/{post_id}")
def blog_post(post_id: str, db: DbDep):
    posts = _platform(db).get("blog") or []
    post = next((p for p in posts if str(p.get("id")) == str(post_id) or p.get("slug") == post_id), posts[0] if posts else None)
    return {"post": post}


@router.get("/platform/careers")
def careers(db: DbDep):
    return {"roles": _platform(db).get("careers") or []}


@router.get("/platform/case-studies")
def case_studies(db: DbDep):
    return {"studies": _platform(db).get("caseStudies") or []}


@router.get("/platform/stats")
def stats(db: DbDep):
    return {"stats": _platform(db).get("stats") or []}


@router.get("/platform/contact")
def contact_info(db: DbDep):
    return _platform(db).get("contact") or {}


@router.post("/platform/newsletter")
def newsletter(body: dict, db: DbDep):
    email = str(body.get("email") or "").strip().lower()
    if not email:
        return {"ok": False, "message": "Email is required."}
    existing = db.scalars(select(NewsletterSubscriber).where(NewsletterSubscriber.email == email)).first()
    if existing is None:
        db.add(NewsletterSubscriber(email=email))
        db.commit()
    return {"ok": True, "message": "Subscribed! Watch your inbox for the next issue."}


@router.post("/platform/contact")
def contact_submit(body: dict, db: DbDep):
    row = ContactInquiry(
        name=body.get("name"),
        email=body.get("email"),
        institution=body.get("institution"),
        topic=body.get("topic"),
        message=body.get("message") or body.get("body"),
    )
    db.add(row)
    db.commit()
    return {"ok": True, "id": row.id, "message": "Message received — our team will reply within one business day."}

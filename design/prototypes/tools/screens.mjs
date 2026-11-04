// The list of prototype screens that the checks walk (design/prototypes/pulse), as URL queries on index.html.
// Shared by zoom-check.mjs (text size) and a11y-check.mjs (screen reader, keyboard, forced colours).
// Add every new screen here so both checks cover it.
export const SUBS = ['profile', 'account', 'email', 'password', 'username', 'security', 'twofa', 'privacy', 'blocked', 'notifications', 'language', 'status', 'help', 'rules', 'terms', 'about', 'delete', 'dna'];
export const SCREENS = [
  '', 'at=age', 'at=uilang', 'at=account', 'at=username', 'at=language', 'at=visibility', 'at=dna', 'at=dna&picks=1', 'at=dnavis', 'at=how', 'at=reminder', 'at=done',
  'flow=drop&at=home', 'flow=drop&at=drop', 'flow=drop&at=drop&open=compose', 'flow=drop&at=answer', 'flow=drop&at=hub', 'flow=drop&at=activity', 'flow=drop&at=profile', 'flow=drop&at=settings',
  ...SUBS.map(s => `flow=drop&at=setsub&s=${s}`),
  'flow=drop&at=setsub&s=delete&step=confirm', 'flow=drop&at=settings&show=logout',
  'at=signin', 'at=pending', 'flow=drop&at=member&as=blocker',
  'flow=drop&at=home&state=loading', 'flow=drop&at=drop&state=error', 'flow=drop&at=drop&state=empty', 'flow=drop&at=home&state=nodrop', 'flow=drop&at=drop&state=long', 'flow=drop&at=home&net=off',
  // round 12a: other members' profiles, lists and requests
  'flow=drop&at=member&who=petra.zvuk&rel=none', 'flow=drop&at=member&who=petra.zvuk&rel=mut', 'flow=drop&at=member&who=mia_vinyl&rel=none', 'flow=drop&at=member&who=nika.rework&rel=none&rbtn=b',
  'flow=drop&at=member&who=petra.zvuk&rel=mut&show=unfollow', 'flow=drop&at=mdrops&who=petra.zvuk&rel=fol', 'flow=drop&at=activity&private=1', 'flow=drop&at=follows&list=followers&private=1',
  'flow=drop&at=follows&list=following', 'flow=drop&at=requests&private=1', 'flow=drop&at=follows&list=followers&private=1&show=remove&h=lukabass',
  // round 12b: member safety
  'flow=drop&at=drop&show=report', 'flow=drop&at=drop&show=report&step=2', 'flow=drop&at=drop&show=report&step=3', 'flow=drop&at=member&who=mia_vinyl&rel=none&show=block', 'flow=drop&at=drop&show=muted', 'flow=drop&at=member&who=mia_vinyl&rel=none&show=muted',
  'flow=drop&at=setsub&s=status', 'flow=drop&at=setsub&s=notice&n=n1', 'flow=drop&at=setsub&s=appeal&n=n1', 'flow=drop&at=setsub&s=reports', 'flow=drop&at=setsub&s=reportd&r=r1',
  'flow=drop&at=setsub&s=blocked&bl=1', 'flow=drop&at=drop&acct=restricted&rst=b', 'at=restricted', 'at=suspended&show=appeal',
  // round 12c: signed-out visitors and sign-in
  'at=landing', 'at=landing&land=b', 'at=landing&land=c&pub=a', 'at=share', 'at=share&share=b&pub=a', 'at=pubprofile&who=nika.rework', 'at=na',
  'at=signin&lock=1', 'at=share&show=signin', 'at=reset', 'at=resetsent', 'at=resetnew', 'at=twofa&tfa=b', 'at=twofa&rec=1', 'at=linkbad&kind=invite', 'at=verified', 'at=share&wall=soft&wallnow=1', 'at=share&wall=hard&wallnow=1',
  // round 12d: the Music DNA editor, edit profile with a photo, help and feedback, SYS-02, SYS-04, before the first Drop, J1 E3/E4
  'flow=drop&at=setsub&s=dna', 'flow=drop&at=setsub&s=dna&dnae=b', 'flow=drop&at=setsub&s=dna&add=genre', 'flow=drop&at=setsub&s=dna&q=nin', 'flow=drop&at=setsub&s=dna&picks=full', 'flow=drop&at=setsub&s=dna&show=aud',
  'flow=drop&at=setsub&s=profile&pic=sample', 'flow=drop&at=setsub&s=profile&pic=sample&photo=b', 'flow=drop&at=setsub&s=profile&pic=sample&show=photo', 'flow=drop&at=setsub&s=profile&show=crop', 'flow=drop&at=setsub&s=profile&show=badfile', 'flow=drop&at=profile&pic=sample',
  'flow=drop&at=setsub&s=help', 'flow=drop&at=setsub&s=help&fb=b', 'flow=drop&at=setsub&s=help&shot=1&type=bug', 'flow=drop&at=setsub&s=help&show=sent',
  'flow=drop&at=hub&state=fail', 'flow=drop&at=hub&state=fail&fail=b', 'flow=drop&at=hub&state=fail&fail=c', 'flow=drop&at=home&state=paused', 'flow=drop&at=drop&state=paused', 'flow=drop&at=drop&state=paused&paused=b', 'flow=drop&at=featoff&f=dna',
  'flow=drop&at=hub&state=first', 'flow=drop&at=hub&state=first&first=b', 'flow=drop&at=home&state=first', 'flow=drop&at=invsigned', 'flow=drop&at=invsigned&same=1', 'at=invmail'
];
